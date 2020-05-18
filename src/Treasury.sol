pragma solidity ^0.6.6;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../lib/BokkyPooBahsRedBlackTreeLibrary.sol";

contract Treasury is IERC20 {
    // TODO: construct interval tree?
    using BokkyPooBahsRedBlackTreeLibrary for BokkyPooBahsRedBlackTreeLibrary.Tree;

    // account -> key -> value
    mapping(address => mapping(uint => uint)) values;
    // account -> tree
    mapping(address => BokkyPooBahsRedBlackTreeLibrary.Tree) trees;

    BokkyPooBahsRedBlackTreeLibrary.Tree global;
    mapping(uint => uint)) values;

    function mint(uint amount) external {
        _mint(address(msg.sender), amount);
    }

    function _mint(address account, uint amount) internal {
        // validate proof
        // verify inclusion
        // validate tx (extract time & value)

        // rb tree insertion
        // TODO: use timestamp from btc-tx
        uint timestamp = block.timestamp + 1000;

        // TODO: possible timestamp collision?
        trees[account].insert(timestamp);
        values[account][timestamp] = amount;

        global.insert(timestamp);
    }

    function allowance(address owner, address spender) external override view returns (uint256) {
        return 0;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        return false;
    }

    function balanceOf(address account) external override view returns (uint256) {
        uint256 amount;
        uint timestamp = block.timestamp;
        uint key = trees[account].root;
        if (key > timestamp) amount += values[account][key];
        while (true) {
            uint key = trees[account].next(timestamp);
            if (key == 0) break;
            amount += values[account][key];
        }
        return amount;
    }

    function totalSupply() external override view returns (uint256) {
        return 0;
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        revert("Unsupported");
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        revert("Unsupported");
    }


}
