// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {BTCReferee} from '../BTCReferee.sol';
import {Bitcoin} from '../types/Bitcoin.sol';

contract MockBTCReferee is BTCReferee {
    constructor() public BTCReferee(address(0)) {
        // solhint-disable-previous-line no-empty-blocks
    }

    function extractOutputValue(
        bytes calldata rawTx,
        bytes20 btcHash,
        Bitcoin.Script format
    ) external pure returns (uint256) {
        return _extractOutputValue(rawTx, btcHash, format);
    }
}
