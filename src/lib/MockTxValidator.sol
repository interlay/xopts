pragma solidity ^0.6.0;

import {ITxValidator} from "./ITxValidator.sol";

contract MockTxValidator is ITxValidator {
    function validateTx(
        bytes calldata rawtx,
        bytes20 btcHash,
        uint256 btcAmount
    ) external override view returns(bool) {
        return true;
    }
}