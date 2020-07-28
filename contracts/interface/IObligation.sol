// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import { Bitcoin } from "../Bitcoin.sol";

interface IObligation {

    function treasury() external returns (address);

    function mint(address account, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external;

    function requestExercise(address buyer, address seller, uint amount) external;

    function executeExercise(address buyer, address seller, uint satoshis) external;

    function refund(address account, uint amount) external;

    function withdraw(uint amount, address pool) external;

    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external;

    function getBtcAddress(address account) external view returns (bytes20 btcHash, Bitcoin.Script format);

}