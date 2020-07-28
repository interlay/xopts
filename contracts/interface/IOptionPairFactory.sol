// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import { Bitcoin } from "../types/Bitcoin.sol";

interface IOptionPairFactory {

    function createOption(
        uint256 expiry,
        uint256 window,
        uint256 strikePrice,
        address referee,
        address collateral
    ) external;

    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external;

    function getBtcAddress() external view returns (bytes20 btcHash, Bitcoin.Script format);

}
