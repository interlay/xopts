// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

interface ITreasury {
    function collateral() external view returns (address);

    function balanceOf(address market, address account) external view returns (uint256);

    function deposit(address market, address account) external;

    function lock(address account, uint256 amount) external;

    function release(
        address from,
        address to,
        uint256 amount
    ) external;
}
