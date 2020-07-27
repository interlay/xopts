// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import { BTCReferee } from "../BTCReferee.sol";

contract MockBTCReferee is BTCReferee {
    constructor () public BTCReferee(address(0)) {}

    function checkTx(
        bytes calldata rawTx,
        bytes20 btcHash,
        uint256 btcAmount
    ) external pure returns(bool) {
        return _isValid(rawTx, btcHash, btcAmount);
    }

    function verifyTx(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawTx,
        bytes20 btcHash,
        uint256 btcAmount
    ) external override view returns(bool) {
        return true;
    }
}