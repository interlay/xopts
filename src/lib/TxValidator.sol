pragma solidity ^0.5.15;

import {ITxValidator} from "./ITxValidator.sol";
import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {Parser} from "@interlay/btc-relay-sol/src/Parser.sol";
import {Script} from "@interlay/btc-relay-sol/src/Script.sol";
import {Bech32} from "@interlay/btc-relay-sol/src/Bech32.sol";

contract TxValidator is ITxValidator {
    using BytesLib for bytes;
    using Parser for bytes;
    using Script for bytes;

    function uintArrayFrom(bytes memory slice) internal pure returns (uint[] memory) {
        uint[] memory ret = new uint[](slice.length);
        for (uint i = 0; i < slice.length; i++) {
            ret[i] = uint(uint8(slice[i]));
        }
        return ret;
    }

    function validateTx(
        bytes calldata rawTx,
        bytes calldata btcAddress,
        uint256 btcAmount
    ) external view returns(bool) {
        (, uint lenInputs) = rawTx.extractInputLength();
        bytes memory outputs = rawTx.slice(lenInputs, rawTx.length - lenInputs);
        (uint numOutputs, ) = outputs.extractOutputLength();

        for (uint i = 0; i < numOutputs; i++) {
            bytes memory output = outputs.extractOutputAtIndex(i);
            (,bytes memory witnessProgram) = output.extractOutputScript().isP2WPKH();

            uint[] memory words = Bech32.convert(uintArrayFrom(witnessProgram), 8, 5);
            uint[] memory version = new uint[](1);
            version[0] = 0;

            // testnet
            uint[] memory hrp = new uint[](2);
            hrp[0] = 116;
            hrp[1] = 98;

            bytes memory result = Bech32.encode(hrp, Bech32.concat(version, words));

            // TODO: prefix should be encoded above
            if (keccak256(abi.encodePacked('tb1', result)) == keccak256(btcAddress)) {
                require(output.extractOutputValue() == btcAmount, "Invalid output amount");
                return true;
            }
        }

        return false;
    }
}

