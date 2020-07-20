pragma solidity ^0.5.15;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";


/// @title An interface for a treasury contract per ERC20
/// @author Interlay
/// @notice This interface manages locking and unlocking of collateral.
interface ITreasury {

    /// Unlock collateral for a specific account
    /// @param account the Ethereum address that locks collateral
    /// @param amount the amount to-be-locked
    function unlock(address account, uint amount) external;

}
