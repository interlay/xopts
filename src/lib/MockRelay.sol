pragma solidity ^0.6.0;

import {IRelay} from "./IRelay.sol";

contract MockRelay is IRelay {
    function verifyTx(
        uint32 height,
        uint256 index,
        bytes32 txid,
        bytes calldata header,
        bytes calldata proof,
        uint256 confirmations,
        bool insecure
    ) external override view returns(bool) {
        return true;
    }

    function getBestBlock() external override view returns (bytes32 digest, uint32 height) {
        return (bytes32(0), 0);
    }
}