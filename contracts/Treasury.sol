pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ITreasury } from "./interface/ITreasury.sol";

/// @title A treasury contract per ERC20
/// @author Interlay
/// @notice This contract manages locking and unlocking of collateral.
contract Treasury is ITreasury, Ownable {
    using SafeMath for uint256;

    string constant ERR_INSUFFICIENT_INPUT = "Insufficient input amount";

    /// @notice The address of the collateral ERC20
    /// @return address of the ERC20 contract
    address public collateral;

    uint internal _totalSupply;

    // obligation -> user -> amount
    mapping (address => mapping (address => uint)) internal _locked;
    mapping (address => mapping (address => uint)) internal _unlocked;

    /// Constructor
    /// @param _collateral address of the ERC20
    constructor(
        address _collateral
    ) public Ownable() {
        collateral = _collateral;
    }

    function balanceUnlocked(address market, address account) external returns (uint) {
        return _unlocked[market][account];
    }

    function balanceLocked(address market, address account) external returns (uint) {
        return _locked[market][account];
    }

    /// @notice Deposit collateral in a given market
    /// @param market Address of the obligation contract
    /// @param account Address of the supplier
    /// @param amount Amount of collateral
    function deposit(address market, address account, uint amount) external {
        require(IERC20(collateral).balanceOf(address(this)) == _totalSupply.add(amount), ERR_INSUFFICIENT_INPUT);
        _unlocked[market][account] = _unlocked[market][account].add(amount);
        _totalSupply = _totalSupply.add(amount);
    }

    /// @notice Withdraw collateral from a given market
    /// @param market Address of the obligation contract
    /// @param amount Amount of collateral
    function withdraw(address market, uint amount) external {
        _unlocked[market][msg.sender] = _unlocked[market][msg.sender].sub(amount);
        IERC20(collateral).transfer(msg.sender, amount);
        _totalSupply = _totalSupply.sub(amount);
    }

    /// @notice Lock collateral for a specific market
    /// @dev Reverts if market account has insufficient balance
    /// @param account Ethereum address that locks collateral
    /// @param amount The amount to be locked
    function lock(address account, uint amount) external {
        _unlocked[msg.sender][account] = _unlocked[msg.sender][account].sub(amount);
        _locked[msg.sender][account] = _locked[msg.sender][account].add(amount);
    }

    /// @notice Unlock collateral for a specific market
    /// @dev Reverts if market account has insufficient balance
    /// @param account Ethereum address that locks collateral
    /// @param amount The amount to be unlocked
    function unlock(address account, uint amount) external {
        _locked[msg.sender][account] = _locked[msg.sender][account].sub(amount);
        _unlocked[msg.sender][account] = _unlocked[msg.sender][account].add(amount);
    }

    /// @notice Release collateral for a specific account
    /// @dev Only callable by the option factory
    /// @param market The obligation token
    /// @param from Ethereum address that locked collateral
    /// @param to Ethereum address to receive collateral
    /// @param amount The amount to be unlocked
    function release(address market, address from, address to, uint amount) external onlyOwner {
        _locked[market][from] = _locked[market][from].sub(amount);
        IERC20(collateral).transfer(to, amount);
        _totalSupply = _totalSupply.sub(amount);
    }

}
