// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { BytesLib } from "@interlay/bitcoin-spv-sol/contracts/BytesLib.sol";
import { Parser } from "@interlay/btc-relay-sol/contracts/Parser.sol";
import { Script } from "@interlay/btc-relay-sol/contracts/Script.sol";
import { IReferee } from "./interface/IReferee.sol";
import { IRelay } from "./interface/IRelay.sol";
import { Bitcoin } from "./types/Bitcoin.sol";

contract BTCReferee is IReferee {
    using SafeMath for uint;
    using BytesLib for bytes;
    using Parser for bytes;
    using Script for bytes;

    string constant ERR_INVALID_OUT_HASH = "Invalid output hash";
    string constant ERR_TX_NOT_INCLUDED = "Cannot verify tx inclusion";

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
        bytes20 btcHash,
        Bitcoin.Script format
    ) internal pure returns(uint256 amount) {
        (, uint lenInputs) = rawTx.extractInputLength();
        bytes memory outputs = rawTx.slice(lenInputs, rawTx.length - lenInputs);
        (uint numOutputs, ) = outputs.extractOutputLength();

        // sum total over all outputs
        for (uint i = 0; i < numOutputs; i++) {
            bytes memory output = outputs.extractOutputAtIndex(i);
            bytes memory script = output.extractOutputScript();
            bytes20 _btcHash;

            if (format == Bitcoin.Script.p2sh && script.isP2SH()) {
                _btcHash = script.P2SH();
            } else if (format == Bitcoin.Script.p2pkh && script.isP2PKH()) {
                _btcHash = script.P2PKH();
            } else if (format == Bitcoin.Script.p2wpkh && script.isP2WPKH()) {
                (, _btcHash) = script.P2WPKH();
            } else {
                continue;
            }

            if (_btcHash == btcHash) {
                amount = amount.add(output.extractOutputValue());
            }
        }
    }

    function verifyTx(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawTx,
        bytes20 btcHash,
        Bitcoin.Script format
    ) external override virtual view returns(uint256) {
        require(btcHash != 0, ERR_INVALID_OUT_HASH);
        require(_isIncluded(height, index, txid, proof), ERR_TX_NOT_INCLUDED);
        return _extractOutputValue(rawTx, btcHash, format);
    }
}
