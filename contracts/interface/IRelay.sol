// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

interface IRelay {
    function verifyTx(
        uint32 height,
        uint256 index,
        bytes32 txid,
        bytes calldata header,
        bytes calldata proof,
        uint256 confirmations,
        bool insecure
    ) external view returns (bool);

    function getBestBlock() external view returns (bytes32 digest, uint32 height);
}
