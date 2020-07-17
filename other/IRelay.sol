pragma solidity ^0.5.15;

interface IRelay {
    function verifyTx(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        uint256 confirmations,
        bool insecure
    ) external view returns(bool);

    function getBestBlock() external view returns (bytes32 digest, uint256 score, uint256 height);
}