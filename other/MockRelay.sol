pragma solidity ^0.5.15;

import {IRelay} from "./IRelay.sol";

contract MockRelay is IRelay {
    function verifyTx(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        uint256 confirmations,
        bool insecure
    ) external view returns(bool) {
        return true;
    }

    function getBestBlock() external view returns (bytes32 digest, uint256 score, uint256 height) {
        return (bytes32(0), 0, 0);
    }
}