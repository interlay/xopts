pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "./ERC20Expiring.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract OptionPool is ERC20Expiring {
    using SafeMath for uint;

    // available option contracts
    struct Option {
        uint expiry_block; // expiry block of the option
        uint premium; // how much does 1 option cost
        uint strike_price; // what is the strike price for 1 FlashBTC
        uint total_supply; // the amount supplied by underwrites
        uint total_underwritten; // the amount currently occupied
    }

    // mapping of option id to the option
    mapping(uint => Option) options;

    // option id
    uint option_id;

    /**
    * @dev Returns an Option from its id
    * @param op_id: the id of the option
    **/
    function get_option(uint op_id) public returns (uint, uint, uint, uint, uint)
    {
        Option memory op = options[op_id];
        return (
            op.expiry_block,
            op.premium,
            op.strike_price,
            op.total_supply,
            op.total_underwritten
        );
    }

    /**
    * @dev Underwrite an option
    * @param op_id: the id of the option
    * @param amount: the amount of coins
    **/
    function underwrite(uint op_id, uint amount) public payable {
        // TODO: integrate with Dai or USDC
        uint current_supply = options[op_id].total_supply;
        options[op_id].total_supply = current_supply.add(amount);
    }

    /**
    * @dev create an option with a certain amount
    * @param amount: the amount of the option
    **/
    function mint(uint amount) external {
        uint block_number = block.timestamp + 1000;

        _mint(address(msg.sender), block_number, amount, 0, 0);
    }
}

