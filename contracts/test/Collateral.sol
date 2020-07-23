pragma solidity ^0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ICollateral is IERC20 {
    function mint(address account, uint256 amount) external returns (bool);
}

// NOTE: Wrapper for testing, do not use.
contract Collateral is ICollateral, ERC20 {
    function mint(address account, uint256 amount) external returns (bool) {
        _mint(account, amount);
        return true;
    }
}
