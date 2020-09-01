// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// NOTE: Wrapper for testing, do not use.
contract MockCollateral is ERC20 {
    constructor() public ERC20("Collateral", "COL") {
        // solhint-disable-previous-line no-empty-blocks
    }

    function mint(address account, uint256 amount) external returns (bool) {
        _mint(account, amount);
        return true;
    }
}
