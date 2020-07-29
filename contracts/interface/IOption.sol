// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import { Bitcoin } from "../types/Bitcoin.sol";

interface IOption {

    function initialize(
        uint256 _expiryTime,
        uint256 _windowSize,
        address _referee,
        address _treasury,
        address _obligation
    ) external;

    function referee() external returns (address);

    function treasury() external returns (address);

    function obligation() external returns (address);

    function mint(address from, address to, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external;

    function requestExercise(address seller, uint amount) external;

    function executeExercise(
        address seller,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external;

    function refund(uint amount) external;

}
