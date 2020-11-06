// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import {Bitcoin} from '../types/Bitcoin.sol';

interface ITreasury {
    function collateral() external view returns (address);

    function balanceOf(address account) external view returns (uint256);

    function lockedIn(address market, address account)
        external
        view
        returns (uint256);

    function deposit(address account) external;

    function lock(address account, uint256 amount)
        external
        returns (bytes20 btcHash, Bitcoin.Script format);

    function unlock(
        address market,
        address account,
        uint256 amount
    ) external;

    function release(
        address from,
        address to,
        uint256 amount
    ) external;

    function authorize(address option) external;
}
