// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import { IRelay } from "../interface/IRelay.sol";

contract MockRelay is IRelay {

    function verifyTx(
        uint256,
        uint256,
        bytes32,
        bytes calldata,
        uint256,
        bool
    ) external override view returns(bool) {
        return true;
    }

    function getBestBlock() external override view returns (bytes32 digest, uint32 height) {
        return (digest, height);
    }

}
