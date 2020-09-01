// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {BTCReferee} from "../BTCReferee.sol";
import {Bitcoin} from "../types/Bitcoin.sol";

contract MockBTCReferee is BTCReferee {
    constructor() public BTCReferee(address(0)) {
        // solhint-disable-previous-line no-empty-blocks
    }

    function extractOutput(
        bytes calldata rawtx,
        bytes20 btcHash,
        Bitcoin.Script format
    ) external pure returns (bytes32 data, uint256 amount) {
        return _extractOutput(rawtx, btcHash, format);
    }
}
