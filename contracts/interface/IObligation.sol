// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {Bitcoin} from '../types/Bitcoin.sol';

interface IObligation {
    function initialize(
        uint8 _decimals,
        uint256 _expiryTime,
        uint256 _windowSize,
        uint256 _strikePrice,
        address _referee,
        address _treasury
    ) external;

    function treasury() external returns (address);

    function referee() external returns (address);

    function mint(
        address account,
        uint256 amount,
        bytes20 btcHash,
        Bitcoin.Script format
    ) external;

    function requestExercise(
        address buyer,
        address seller,
        uint256 satoshis
    ) external returns (uint256);

    function executeExercise(
        bytes32 reqid,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external;

    function refund(uint256 amount) external;

    function withdraw(uint256 amount, address pool) external;
}
