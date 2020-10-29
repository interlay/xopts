// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

interface IEuropean {
    function expiryTime() external returns (uint256);

    function windowSize() external returns (uint256);

    function canExit() external returns (bool);
}
