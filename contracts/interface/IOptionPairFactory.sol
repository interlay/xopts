// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {Bitcoin} from '../types/Bitcoin.sol';

interface IOptionPairFactory {
    function enableAsset(address collateral) external;

    function disableAsset(address collateral) external;

    function createPair(
        uint256 expiry,
        uint256 window,
        uint256 strikePrice,
        address referee,
        address collateral
    ) external returns (address option, address obligation);
}
