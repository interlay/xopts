// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import { BTCReferee } from "../BTCReferee.sol";

contract MockBTCReferee is BTCReferee {
    constructor () public BTCReferee(address(0)) {}

    function extractOutputValue(
        bytes calldata rawTx,
        bytes20 btcHash
    ) external pure returns(uint256) {
        return _extractOutputValue(rawTx, btcHash);
    }
}
