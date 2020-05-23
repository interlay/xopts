pragma solidity ^0.5.15;

import {ITxValidator} from "./ITxValidator.sol";
import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {Parser} from "./btc-relay-sol/src/Parser.sol";
import {Script} from "./btc-relay-sol/src/Script.sol";

contract TxValidator is ITxValidator {
    using BytesLib for bytes;
    using Parser for bytes;
    using Script for bytes;

    function validateTx(
        bytes calldata rawtx,
        bytes20 btcAddress,
        uint256 btcAmount
    ) external view returns(bool) {
        (, uint lenInputs) = rawtx.extractInputLength();
        bytes memory outputs = rawtx.slice(lenInputs, rawtx.length - lenInputs);
        (uint numOutputs,) = outputs.extractOutputLength();
        require(numOutputs == 1, "Requires exactly one output");
        bytes memory output = outputs.extractOutputAtIndex(0);
        require(output.extractOutputValue() == btcAmount, "Invalid output amount");
        bytes20 outAddress = toBytes20(output.extractOutputScript().isP2PKH());
        require(outAddress == btcAddress, "Invalid output address");
        return true;
    }

    function toBytes20(bytes memory _source) internal pure returns (bytes20 result) {
        if (_source.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(_source, 20))
        }
    }
}

