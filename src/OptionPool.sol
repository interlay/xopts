pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Option.sol";

contract OptionPool {
    using SafeMath for uint;

    // Backing asset (eg. Dai or USDC)
    IERC20 collateral;

    address[] public options;

    constructor(address _asset) public {
        collateral = IERC20(_asset);
    }

    /**
    * @dev Create an option and return it's address
    * @param _expiry: block number
    * @param _strikePrice: amount of collateral to payout per token
    **/
    function create(uint _expiry, uint _strikePrice) public returns (address) {
        PutOption option = new PutOption(
            collateral,
            msg.sender,
            _expiry,
            _strikePrice
        );
        options.push(address(option));
        return address(option);
    }
}

