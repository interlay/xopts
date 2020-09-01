// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {Bitcoin} from "../types/Bitcoin.sol";

interface IWriterRegistry {
    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external;

    function getBtcAddress(address account) external view returns (bytes20 btcHash, Bitcoin.Script format);

    function allWriters() external view returns (address[] memory);
}
