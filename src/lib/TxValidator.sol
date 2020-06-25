pragma solidity ^0.5.15;

import {ITxValidator} from "./ITxValidator.sol";
import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {Parser} from "@interlay/btc-relay-sol/src/Parser.sol";
import {Script} from "@interlay/btc-relay-sol/src/Script.sol";

contract TxValidator is ITxValidator {
    using BytesLib for bytes;
    using Parser for bytes;
    using Script for bytes;

    string constant ERR_INVALID_HASH = "Invalid output hash";
    string constant ERR_INVALID_AMOUNT = "Invalid output amount";

    function validateTx(
        bytes calldata rawTx,
        bytes20 btcHash,
        uint256 btcAmount
    ) external view returns(bool) {
        require(btcHash != 0, ERR_INVALID_HASH);
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
                require(output.extractOutputValue() >= btcAmount, ERR_INVALID_AMOUNT);
                return true;
            }
        }

        return false;
    }
}

