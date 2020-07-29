// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

import { BytesLib } from "@interlay/bitcoin-spv-sol/contracts/BytesLib.sol";
import { Parser } from "@interlay/btc-relay-sol/src/Parser.sol";
import { Script } from "@interlay/btc-relay-sol/src/Script.sol";
import { IReferee } from "./interface/IReferee.sol";
import { IRelay } from "./interface/IRelay.sol";

contract BTCReferee is IReferee {
    using BytesLib for bytes;
    using Parser for bytes;
    using Script for bytes;

    string constant ERR_INVALID_OUT_HASH = "Invalid output hash";
    string constant ERR_TX_NOT_INCLUDED = "Cannot verify tx inclusion";
    string constant ERR_INVALID_TX = "Tx is invalid";

    address relay;

    constructor(address _relay) public {
        relay = _relay;
    }

    function _isIncluded(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes memory proof
    ) internal view returns (bool) {
        return IRelay(relay).verifyTx(height, index, txid, proof, 0, false);
    }

    function _extractOutputValue(
        bytes memory rawTx,
        bytes20 btcHash
    ) internal pure returns(uint256) {
        (, uint lenInputs) = rawTx.extractInputLength();
        bytes memory outputs = rawTx.slice(lenInputs, rawTx.length - lenInputs);
        (uint numOutputs, ) = outputs.extractOutputLength();

        for (uint i = 0; i < numOutputs; i++) {
            bytes memory output = outputs.extractOutputAtIndex(i);
            bytes memory script = output.extractOutputScript();
            bytes20 _btcHash;

            // TODO: explicitly check format
            if (script.isP2SH()) {
                _btcHash = script.P2SH();
            } else if (script.isP2PKH()) {
                _btcHash = script.P2PKH();
            } else if (script.isP2WPKH()) {
                (, _btcHash) = script.P2WPKH();
            }

            if (_btcHash == btcHash) {
                return output.extractOutputValue();
            }
        }

        revert(ERR_INVALID_TX);
    }

    function verifyTx(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawTx,
        bytes20 btcHash
    ) external override virtual view returns(uint256) {
        require(btcHash != 0, ERR_INVALID_OUT_HASH);
        require(_isIncluded(height, index, txid, proof), ERR_TX_NOT_INCLUDED);
        return _extractOutputValue(rawTx, btcHash);
    }
}
