// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import '@nomiclabs/buidler/console.sol';

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {BTCUtils} from '@interlay/bitcoin-spv-sol/contracts/BTCUtils.sol';
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
    string internal constant ERR_TX_ID_BLOCKED = 'Transaction ID blocked';
    string internal constant ERR_TX_NOT_EXPIRED = 'Tx sent before expiry';
    string internal constant ERR_TX_NOT_INCLUDED = 'Cannot verify tx inclusion';

    address public relay;

    mapping(bytes32 => bool) internal _blocked;

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

    function _extractOutputValue(
        bytes memory rawtx,
        bytes20 btcHash,
        Bitcoin.Script format
    ) internal pure returns (uint256 amount) {
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
     * @param height Bitcoin block height
     * @param index Bitcoin tx index
     * @param txid Bitcoin transaction id
     * @param header Bitcoin block header
     * @param proof Bitcoin inclusion proof
     * @param rawtx Bitcoin raw tx
     * @param btcHash Bitcoin address hash
     * @param format Bitcoin script format
     * @param expiryTime Option pair expiry
     * @return Bitcoin output satoshis
     **/
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
    ) external virtual override returns (uint256) {
        require(btcHash != 0, ERR_INVALID_OUT_HASH);
        require(!_blocked[txid], ERR_TX_ID_BLOCKED);
        _blocked[txid] = true;
        require(
            BTCUtils.extractTimestamp(header) >= expiryTime,
            ERR_TX_NOT_EXPIRED
        );
        require(
            _isIncluded(height, index, txid, header, proof),
            ERR_TX_NOT_INCLUDED
        );
        return _extractOutputValue(rawtx, btcHash, format);
    }
}
