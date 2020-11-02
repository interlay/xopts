// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import 'hardhat/console.sol';

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {BytesLib} from '@interlay/bitcoin-spv-sol/contracts/BytesLib.sol';
import {Parser} from '@interlay/btc-relay-sol/contracts/Parser.sol';
import {Script} from '@interlay/btc-relay-sol/contracts/Script.sol';
import {IReferee} from './interface/IReferee.sol';
import {IRelay} from './interface/IRelay.sol';
import {Bitcoin} from './types/Bitcoin.sol';

contract BTCReferee is IReferee {
    using SafeMath for uint256;
    using BytesLib for bytes;
    using Parser for bytes;
    using Script for bytes;

    string internal constant ERR_INVALID_OUT_HASH = 'Invalid output hash';
    string internal constant ERR_TX_NOT_INCLUDED = 'Cannot verify tx inclusion';
    string internal constant ERR_INVALID_REQUEST_ID = 'Invalid request id';

    address public relay;

    constructor(address _relay) public {
        relay = _relay;
    }

    function _isIncluded(
        uint32 height,
        uint256 index,
        bytes32 txid,
        bytes memory header,
        bytes memory proof
    ) internal view returns (bool) {
        return
            IRelay(relay).verifyTx(
                height,
                index,
                txid,
                header,
                proof,
                0,
                false
            );
    }

    function _extractOutput(
        bytes memory rawtx,
        bytes20 btcHash,
        Bitcoin.Script format
    ) internal pure returns (bytes32 data, uint256 amount) {
        (, uint256 lenInputs) = rawtx.extractInputLength();
        bytes memory outputs = rawtx.slice(lenInputs, rawtx.length - lenInputs);
        (uint256 numOutputs, ) = outputs.extractOutputLength();

        // sum total over all outputs
        for (uint256 i = 0; i < numOutputs; i++) {
            bytes memory output = outputs.extractOutputAtIndex(i);
            bytes memory script = output.extractOutputScript();
            bytes20 _btcHash;

            if (format == Bitcoin.Script.p2sh && script.isP2SH()) {
                _btcHash = script.P2SH();
            } else if (format == Bitcoin.Script.p2pkh && script.isP2PKH()) {
                _btcHash = script.P2PKH();
            } else if (format == Bitcoin.Script.p2wpkh && script.isP2WPKH()) {
                (, _btcHash) = script.P2WPKH();
            } else if (script.isOpReturn()) {
                data = script.OpReturn().toBytes32();
            } else {
                continue;
            }

            if (_btcHash == btcHash) {
                amount = amount.add(output.extractOutputValue());
            }
        }
    }

    /**
     * @notice Verify transaction inclusion through the configured BTC relay,
     * ensure submission after expiry and block processed tx ids to prevent
     * replays.
     * @param id Unique request id
     * @param height Bitcoin block height
     * @param index Bitcoin tx index
     * @param txid Bitcoin transaction id
     * @param header Bitcoin block header
     * @param proof Bitcoin inclusion proof
     * @param rawtx Bitcoin raw tx
     * @param btcHash Bitcoin address hash
     * @param format Bitcoin script format
     * @return Bitcoin output satoshis
     **/
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
    ) external virtual override returns (uint256) {
        require(btcHash != 0, ERR_INVALID_OUT_HASH);
        require(
            _isIncluded(height, index, txid, header, proof),
            ERR_TX_NOT_INCLUDED
        );
        (bytes32 data, uint256 amount) = _extractOutput(rawtx, btcHash, format);
        require(data == id, ERR_INVALID_REQUEST_ID);
        return amount;
    }
}
