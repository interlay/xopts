pragma solidity ^0.5.15;

interface ITxValidator {
    function validateTx(
        bytes calldata rawtx,
        bytes20 output,
        uint256 amount
    ) external view returns(bool);
}