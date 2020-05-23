pragma solidity ^0.5.15;

import {ITxValidator} from "./ITxValidator.sol";

contract MockTxValidator is ITxValidator {
    function validateTx(
        bytes calldata rawtx,
        bytes20 output,
        uint256 amount
    ) external view returns(bool) {
        return true;
    }
}