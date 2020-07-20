pragma solidity ^0.5.15;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ITreasury } from "./interface/ITreasury.sol";

/// @title A treasury contract per ERC20
/// @author Interlay
/// @notice This contract manages locking and unlocking of collateral.
contract Treasury is ITreasury {
    /// Error codes
    string constant ERR_ONLY_FACTORY = "Function can only be called by the OptionFactory";

    /// The address of the OptionFactory
    /// @return address of the OptionFactory
    address public factory;

    /// The address of the collateral ERC20
    /// @return address of the ERC20 contract
    address public collateral;

    /// Constructor
    /// @param _collateral address of the ERC20
    constructor(
        address _collateral
    ) public {
        factory = msg.sender;
        collateral = _collateral;
    }

    /// Lock collateral for a specific account.
    /// @param account the Ethereum address that locks collateral
    /// @param amount the amount to-be-locked
    function lock(address account, uint amount) external {
        IERC20(collateral).transferFrom(account, address(this), amount);
    }

    /// Unlock collateral for a specific account
    /// @param account the Ethereum address that locks collateral
    /// @param amount the amount to-be-locked
    function unlock(address account, uint amount) external {
        require(msg.sender == factory, ERR_ONLY_FACTORY);
        IERC20(collateral).transferFrom(address(this), account, amount);
    }

}
