pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Option.sol";

contract OptionPool {
    using SafeMath for uint;

    // backing asset (eg. Dai or USDC)
    IERC20 collateral;

    // the asset to insure
    IERC20 underlying;

    address[] public options;

    constructor(address _collateral, address _underlying) public {
        collateral = IERC20(_collateral);
        underlying = IERC20(_underlying);
    }

    /**
    * @dev Create an option and return it's address
    * @param _expiry: block number
    * @param _premium: fee required to lock and exercise option
    * @param _strikePrice: amount of collateral to payout per token
    **/
    function create(uint _expiry, uint _premium, uint _strikePrice) public returns (address) {
        PutOption option = new PutOption(
            collateral,
            underlying,
            msg.sender,
            _expiry,
            _premium,
            _strikePrice
        );
        options.push(address(option));
        return address(option);
    }
}

