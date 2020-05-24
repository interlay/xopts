pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import {IRelay} from "./lib/IRelay.sol";
import {ITxValidator} from "./lib/ITxValidator.sol";
import "./lib/IERC137.sol";
import "./Option.sol";


contract OptionPool {
    using SafeMath for uint256;

    // backing asset (eg. Dai or USDC)
    IERC20 _collateral;

    // btc relay
    IRelay _relay;
    ITxValidator _valid;

    IERC137Registry _ens;

    address[] private _options;

    constructor(
        address collateral,
        address relay,
        address valid,
        address ens
    ) public {
        _collateral = IERC20(collateral);
        _relay = IRelay(relay);
        _valid = ITxValidator(valid);
        _ens = IERC137Registry(ens);
    }

    /**
     * @dev Create an option and return it's address
     * @param _expiry: unix timestamp
     * @param _premium: fee required to lock and exercise option
     * @param _strikePrice: amount of collateral to payout per token
     **/
    function createOption(
        uint256 _expiry,
        uint256 _premium,
        uint256 _strikePrice
    ) public returns (address) {
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

    function getOptionInfoAt(uint256 index)
        external
        view
        returns (
            uint256 expiry,
            uint256 premium,
            uint256 strikePrice,
            address addr
        )
    {
        PutOption opt = PutOption(_options[index]);
        expiry = opt.getExpiry();
        premium = opt.getPremium();
        strikePrice = opt.getStrikePrice();
        addr = _options[index];
        return (expiry, premium, strikePrice, addr);
    }

    function getOptions() external view returns (address[] memory) {
        return _options;
    }

    function getUserPurchasedOptions(address user)
        external
        view
        returns (
            address[] memory options,
            uint256[] memory currentOptions
        )
    {
        options = new address[](_options.length);
        currentOptions = new uint256[](_options.length);

        for (uint256 i = 0; i < _options.length; i++) {
            PutOption opt = PutOption(_options[i]);
            uint256 current_options = opt
                .getCurrentOptionsForUser(user);
            if (current_options != 0) {
                options[i] = _options[i];
                currentOptions[i] = current_options;
            }
        }

        return (options, currentOptions);
    }

    function getUserSoldOptions(address user)
        external
        view
        returns (
            address[] memory options,
            uint256[] memory availableOptions
        )
    {
        options = new address[](_options.length);
        availableOptions = new uint256[](_options.length);

        for (uint256 i = 0; i < _options.length; i++) {
            PutOption opt = PutOption(_options[i]);
            uint256 available_options = opt
                .getAvailableOptionsForUser(user);
            if (available_options != 0) {
                options[i] = _options[i];
                availableOptions[i] = available_options;
            }
        }
        return (options, availableOptions);
    }
}
