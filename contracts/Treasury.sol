pragma solidity ^0.5.15;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";
import { ITreasury } from "./interface/ITreasury.sol";

/// @title A treasury contract per ERC20
/// @author Interlay
/// @notice This contract manages locking and unlocking of collateral.
contract Treasury is ITreasury, Ownable {
    /// The address of the collateral ERC20
    /// @return address of the ERC20 contract
    address public collateral;

    /// Constructor
    /// @param _collateral address of the ERC20
    constructor(
        address _collateral
    ) public Ownable() {
        collateral = _collateral;
    }

    // Note: OptionPairFactory handles transfer to this contract

    /// Unlock collateral for a specific account
    /// @param account the Ethereum address that locks collateral
    /// @param amount the amount to-be-locked
    function unlock(address account, uint amount) external onlyOwner {
        IERC20(collateral).transfer(account, amount);
    }

}
