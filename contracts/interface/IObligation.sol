// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import { Bitcoin } from "../Bitcoin.sol";

interface IObligation {

    function treasury() external returns (address);

    function mint(address account, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external;

    function exercise(address buyer, address seller, uint options, uint amount) external;

    function refund(address account, uint amount) external;

    function getAmountPaid(address seller) external view returns (uint);

    function getWriters() external view returns (address[] memory writers, uint256[] memory written);

    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external;

    function getBtcAddress(address account) external view returns (bytes20 btcHash, Bitcoin.Script format);

}