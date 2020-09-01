// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {Bitcoin} from "../types/Bitcoin.sol";

interface IReferee {
    function verifyTx(
        bytes32 id,
        uint32 height,
        uint256 index,
        bytes32 txid,
        bytes calldata header,
        bytes calldata proof,
        bytes calldata rawtx,
        bytes20 btcHash,
        Bitcoin.Script format
    ) external returns (uint256);
}
