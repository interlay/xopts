pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import {IRelay} from "./lib/IRelay.sol";
import {ITxValidator} from "./lib/ITxValidator.sol";
import {IERC20Buyable} from "./IERC20Buyable.sol";
import {IERC20Sellable} from "./IERC20Sellable.sol";
import {ERC20Sellable} from "./ERC20Sellable.sol";

contract OptionPool {
    using SafeMath for uint256;

    // backing asset (eg. Dai or USDC)
    IERC20 _collateral;

    // btc relay
    IRelay _relay;

    // tx validation
    ITxValidator _validator;

    address[] private _options;
    mapping (address => address) _pair;

    constructor(
        address collateral,
        address relay,
        address validator
    ) public {
        _collateral = IERC20(collateral);
        _relay = IRelay(relay);
        _validator = ITxValidator(validator);
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
        ERC20Sellable option = new ERC20Sellable(
            _collateral,
            _relay,
            _validator,
            _expiry,
            _premium,
            _strikePrice
        );
        address sellable = address(option);
        address buyable = option.getBuyable();
        _options.push(sellable);
        _pair[sellable] = buyable;
        return sellable;
    }

    function getOptions() external view returns (address[] memory) {
        return _options;
    }

    function getUserPurchasedOptions(address user) external view
        returns (
            address[] memory options,
            uint256[] memory currentOptions
        )
    {
        options = new address[](_options.length);
        currentOptions = new uint256[](_options.length);

        for (uint256 i = 0; i < _options.length; i++) {
            IERC20Buyable opt = IERC20Buyable(_pair[_options[i]]);
            uint256 current = opt.balanceOf(user);
            if (current != 0) {
                options[i] = _options[i];
                currentOptions[i] = current;
            }
        }

        return (options, currentOptions);
    }

    function getUserSoldOptions(address user) external view
        returns (
            address[] memory options,
            uint256[] memory availableOptions
        )
    {
        options = new address[](_options.length);
        availableOptions = new uint256[](_options.length);

        for (uint256 i = 0; i < _options.length; i++) {
            IERC20Sellable opt = IERC20Sellable(_options[i]);
            uint256 available = opt.balanceOf(user);
            if (available != 0) {
                options[i] = _options[i];
                availableOptions[i] = available;
            }
        }
        return (options, availableOptions);
    }
}
