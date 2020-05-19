pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "./ERC20Expiring.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Treasury is ERC20Expiring {
    using SafeMath for uint;

    function mint(uint amount) external {
        // validate proof
        // verify inclusion
        // validate tx (extract time & value)
        // rb tree insertion
        // TODO: use timestamp from btc-tx
        // NOTE: use block numbers instead of timestamps to minimize
        // possible entropy of expiry times
        uint block_number = block.timestamp + 1000;

        // TODO: possible timestamp collision?
        // trees[account].insert(timestamp);
        // values[account][timestamp] = amount;
        _mint(address(msg.sender), block_number, amount, 0, 0);
    }
}
