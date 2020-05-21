pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Option.sol";

contract OptionPool {
    using SafeMath for uint;

    // backing asset (eg. Dai or USDC)
    IERC20 _collateral;

    address[] private _options;

    constructor(address collateral) public {
        _collateral = IERC20(collateral);
    }

    /**
    * @dev Create an option and return it's address
    * @param _expiry: block number
    * @param _premium: fee required to lock and exercise option
    * @param _strikePrice: amount of collateral to payout per token
    **/
    function createOption(uint _expiry, uint _premium, uint _strikePrice) public returns (address) {
        PutOption option = new PutOption(
            _collateral,
            _expiry,
            _premium,
            _strikePrice
        );
        _options.push(address(option));
        return address(option);
    }

    function getOptions() external view returns (address[] memory) {
        return _options;
    }
}

