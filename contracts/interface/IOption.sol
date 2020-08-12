// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {Bitcoin} from '../types/Bitcoin.sol';

interface IOption {
    function initialize(
        uint8 _decimals,
        uint256 _expiryTime,
        uint256 _windowSize,
        address _obligation
    ) external;

    function obligation() external returns (address);

    function mint(
        address from,
        address to,
        uint256 amount,
        bytes20 btcHash,
        Bitcoin.Script format
    ) external;

    function requestExercise(address seller, uint256 satoshis) external;
}
