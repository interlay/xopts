// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {Bitcoin} from '../types/Bitcoin.sol';

interface IOption {
    function initialize(
        uint8 _decimals,
        uint256 _expiryTime,
        uint256 _windowSize
    ) external;

    function mintToPool(
        address writer,
        address pair,
        uint256 amount
    ) external;

    function mintToWriter(address writer, uint256 amount) external;

    function requestExercise(address buyer, uint256 satoshis) external;
}
