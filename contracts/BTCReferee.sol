pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";

import { BytesLib } from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import { Parser } from "@interlay/btc-relay-sol/src/Parser.sol";
import { Script } from "@interlay/btc-relay-sol/src/Script.sol";
import { IReferee } from "./interface/IReferee.sol";
import { IRelay } from "./interface/IRelay.sol";

contract BTCReferee is IReferee {
    using BytesLib for bytes;
    using Parser for bytes;
    using Script for bytes;

    string constant ERR_INVALID_OUT_HASH = "Invalid output hash";
    string constant ERR_INVALID_OUT_AMOUNT = "Invalid output amount";
    string constant ERR_VERIFY_TX = "Cannot verify tx inclusion";

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

    function _isValid(
        bytes memory rawTx,
        bytes20 btcHash,
        uint256 btcAmount
    ) internal pure returns(bool) {
        (, uint lenInputs) = rawTx.extractInputLength();
        bytes memory outputs = rawTx.slice(lenInputs, rawTx.length - lenInputs);
        (uint numOutputs, ) = outputs.extractOutputLength();

        for (uint i = 0; i < numOutputs; i++) {
            bytes memory output = outputs.extractOutputAtIndex(i);
            bytes memory script = output.extractOutputScript();
            bytes20 _btcHash;

            if (script.isP2SH()) {
                _btcHash = script.P2SH();
            } else if (script.isP2PKH()) {
                _btcHash = script.P2PKH();
            } else if (script.isP2WPKH()) {
                (, _btcHash) = script.P2WPKH();
            }

            if (_btcHash == btcHash) {
                require(output.extractOutputValue() >= btcAmount, ERR_INVALID_OUT_AMOUNT);
                return true;
            }
        }

        return false;
    }

    function verifyTx(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawTx,
        bytes20 btcHash,
        uint256 btcAmount
    ) external view returns(bool) {
        require(btcHash != 0, ERR_INVALID_OUT_HASH);
        require(_isIncluded(height, index, txid, proof), ERR_VERIFY_TX);
        require(_isValid(rawTx, btcHash, btcAmount), ERR_VERIFY_TX);
        return true;
    }
}
