pragma solidity ^0.5.15;

interface IReferee {
    function verifyTx(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawTx,
        bytes20 btcHash,
        uint256 btcAmount
    ) external view returns(bool);
}