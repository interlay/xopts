pragma solidity ^0.5.15;

interface ITxValidator {
    function validateTx(
        bytes calldata rawtx,
        bytes calldata btcAddress,
        uint256 btcAmount
    ) external view returns(bool);
}