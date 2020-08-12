// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {Bitcoin} from '../types/Bitcoin.sol';

interface IOption {
    function initialize(
        uint8 _decimals,
        uint256 _expiryTime,
        uint256 _windowSize,
        address _obligation,
        address _referee
    ) external;

    function referee() external returns (address);

    function obligation() external returns (address);

    function mint(
        address from,
        address to,
        uint256 amount,
        bytes20 btcHash,
        Bitcoin.Script format
    ) external;

    function requestExercise(address seller, uint256 satoshis) external;

    function executeExercise(
        address seller,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external;

    function refund(uint256 amount) external;
}
