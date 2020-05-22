pragma solidity ^0.5.15;

interface IValid {
    function validateTx(
        bytes32 txid,
        bytes calldata rawtx,
        bytes20[] calldata authors,
        uint256[] calldata amounts
    ) external view returns(bool);
}