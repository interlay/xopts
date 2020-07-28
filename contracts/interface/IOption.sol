// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import { Bitcoin } from "../Bitcoin.sol";

interface IOption {

    function referee() external returns (address);

    function treasury() external returns (address);

    function obligation() external returns (address);

    function mint(address from, address to, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external;

    function exercise(
        address seller,
        uint256 amount,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external;

    function refund(uint amount) external;

    function getBalancePreExpiry() external view returns (uint256);

}
