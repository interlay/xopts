pragma solidity ^0.5.15;

import {IValid} from "./IValid.sol";

contract MockValid is IValid {
    function validateTx(
        bytes32 txid,
        bytes calldata rawtx,
        bytes20[] calldata authors,
        uint256[] calldata amounts
    ) external view returns(bool) {
        return true;
    }
}