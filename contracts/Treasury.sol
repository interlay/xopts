// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ITreasury } from "./interface/ITreasury.sol";

/// @title Treasury ERC20
/// @author Interlay
/// @notice This contract manages locking and unlocking of collateral.
/// @dev This should not be ownable since it may be shared across factories.
/// @dev All operations MUST be called atomically to prevent misappropriation.
contract Treasury is ITreasury, ReentrancyGuard {
    using SafeMath for uint256;

    string constant ERR_INSUFFICIENT_DEPOSIT = "Insufficient deposit amount";
    string constant ERR_INSUFFICIENT_LOCKED = "Insufficient collateral locked";
    string constant ERR_INSUFFICIENT_UNLOCKED = "Insufficient collateral unlocked";

    /// @notice The address of the collateral ERC20
    /// @return address of the ERC20 contract
    address public override collateral;

    uint internal reserve;

    // obligation -> user -> amount
    mapping (address => mapping (address => uint)) internal _locked;
    mapping (address => mapping (address => uint)) internal _unlocked;

    /// @notice Initialize the treasury contract against an ERC20 token.
    /// @param _collateral address of the ERC20
    constructor(
        address _collateral
    ) public {
        collateral = _collateral;
    }

    /// @notice Returns the balance of an `account` under a particular `market`.
    /// @param market Address of the market
    /// @param account Address of the supplier
    function balanceOf(address market, address account) external override view returns (uint) {
        return _locked[market][account];
    }

    /// @notice Deposit collateral in the specified `market`. Assumes
    /// collateral has been transferred within the same transaction and claims
    /// the unreserved balance since the last deposit.
    /// @dev Once 'unlocked' the caller must atomically write options or buy obligations
    /// to prevent misapproriation.
    /// @param market Address of the market
    /// @param account Address of the supplier
    function deposit(address market, address account) external override nonReentrant {
        uint balance = IERC20(collateral).balanceOf(address(this));
        uint amount = balance.sub(reserve);
        require(amount > 0, ERR_INSUFFICIENT_DEPOSIT);
        _unlocked[market][account] = _unlocked[market][account].add(amount);
        reserve = balance;
    }

    /// @notice Lock collateral for the caller, assuming sufficient
    /// funds have been deposited against the market.
    /// @dev Reverts if if there is insufficient funds 'unlocked'.
    /// @param account Ethereum address that locks collateral
    /// @param amount The amount to be locked
    function lock(address account, uint amount) external override nonReentrant {
        _unlocked[msg.sender][account] = _unlocked[msg.sender][account].sub(amount, ERR_INSUFFICIENT_UNLOCKED);
        _locked[msg.sender][account] = _locked[msg.sender][account].add(amount);
    }

    /// @notice Release collateral for a specific account owned by
    /// the caller. For instance, if an account has exercised or 
    /// refunded their options against a specific market (obligation),
    /// after performing the necessary correctness checks that contract
    /// should call this function.
    /// @param from Ethereum address that locked collateral
    /// @param to Ethereum address to receive collateral
    /// @param amount The amount to be unlocked
    function release(address from, address to, uint amount) external override nonReentrant {
        _locked[msg.sender][from] = _locked[msg.sender][from].sub(amount, ERR_INSUFFICIENT_LOCKED);
        IERC20(collateral).transfer(to, amount);
        reserve = IERC20(collateral).balanceOf(address(this));
    }

}
