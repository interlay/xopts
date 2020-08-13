// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {Bitcoin} from '../types/Bitcoin.sol';

interface IReferee {
    function verifyTx(
        uint32 height,
        uint256 index,
        bytes32 txid,
        bytes calldata header,
        bytes calldata proof,
        bytes calldata rawtx,
        bytes20 btcHash,
        Bitcoin.Script format,
        uint256 expiryTime
    ) external returns (uint256);
}
