pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ITreasury } from "./interface/ITreasury.sol";

/// @title A treasury contract per ERC20
/// @dev This should not be ownable since it may be shared across factories
/// @dev All operations MUST be called atomically to prevent misappropriation
/// @author Interlay
/// @notice This contract manages locking and unlocking of collateral.
contract Treasury is ITreasury {
    using SafeMath for uint256;

    string constant ERR_INSUFFICIENT_DEPOSIT = "Insufficient deposit amount";
    string constant ERR_INSUFFICIENT_LOCKED = "Insufficient collateral locked";
    string constant ERR_INSUFFICIENT_UNLOCKED = "Insufficient collateral unlocked";

    /// @notice The address of the collateral ERC20
    /// @return address of the ERC20 contract
    address public collateral;

    uint internal reserve;

    // obligation -> user -> amount
    mapping (address => mapping (address => uint)) internal _locked;
    mapping (address => mapping (address => uint)) internal _unlocked;

    /// Constructor
    /// @param _collateral address of the ERC20
    constructor(
        address _collateral
    ) public {
        collateral = _collateral;
    }

    function balanceOf(address market, address account) external view returns (uint) {
        return _locked[market][account];
    }

    /// @notice Deposit collateral in a given market
    /// @dev Separate transfer required
    /// @param market Address of the obligation contract
    /// @param account Address of the supplier
    function deposit(address market, address account) external {
        uint balance = IERC20(collateral).balanceOf(address(this));
        uint amount = balance.sub(reserve);
        require(amount > 0, ERR_INSUFFICIENT_DEPOSIT);
        _unlocked[market][account] = _unlocked[market][account].add(amount);
        reserve = balance;
    }

    /// @notice Lock collateral for a specific market
    /// @dev Reverts if market account has insufficient balance
    /// @param account Ethereum address that locks collateral
    /// @param amount The amount to be locked
    function lock(address account, uint amount) external {
        _unlocked[msg.sender][account] = _unlocked[msg.sender][account].sub(amount, ERR_INSUFFICIENT_UNLOCKED);
        _locked[msg.sender][account] = _locked[msg.sender][account].add(amount);
    }

    /// @notice Release collateral for a specific account
    /// @param from Ethereum address that locked collateral
    /// @param to Ethereum address to receive collateral
    /// @param amount The amount to be unlocked
    function release(address from, address to, uint amount) external {
        _locked[msg.sender][from] = _locked[msg.sender][from].sub(amount, ERR_INSUFFICIENT_LOCKED);
        IERC20(collateral).transfer(to, amount);
        reserve = IERC20(collateral).balanceOf(address(this));
    }

}
