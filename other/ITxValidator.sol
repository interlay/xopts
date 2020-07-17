pragma solidity ^0.5.15;

interface ITxValidator {
    function validateTx(
        bytes calldata rawtx,
        bytes20 btcHash,
        uint256 btcAmount
    ) external view returns(bool);
}