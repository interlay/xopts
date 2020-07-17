pragma solidity ^0.5.15;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ITreasury } from "./interface/Treasury.sol";

contract Treasury is ITreasury {
    address public collateral;

    constructor(
        address _collateral
    ) public {
        collateral = _collateral;
    }

    function lock(address account, uint amount) external {
        IERC20(collateral).transferFrom(account, address(this), amount);
    }

}
