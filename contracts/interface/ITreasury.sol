// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

/// @title An interface for a treasury contract per ERC20
/// @author Interlay
/// @notice This interface manages locking and unlocking of collateral.
interface ITreasury {

    function collateral() external returns (address);

    function balanceOf(address market, address account) external view returns (uint);

    function deposit(address market, address account) external;

    function lock(address account, uint amount) external;

    function release(address from, address to, uint amount) external;

}
