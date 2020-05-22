pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import {IRelay} from "./lib/IRelay.sol";
import {IValid} from "./lib/IValid.sol";
import "./lib/IERC137.sol";
import "./Option.sol";

contract OptionPool {
    using SafeMath for uint;

    // backing asset (eg. Dai or USDC)
    IERC20 _collateral;

    // btc relay
    IRelay _relay;
    IValid _valid;

    IERC137Registry _ens;

    address[] private _options;

    constructor(address collateral, address relay, address valid, address ens) public {
        _collateral = IERC20(collateral);
        _relay = IRelay(relay);
        _valid = IValid(valid);
        _ens = IERC137Registry(ens);
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
            _relay,
            _valid,
            _ens,
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

