pragma solidity ^0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import {IterableAddresses} from "./IterableAddresses.sol";
import {IRelay} from "./lib/IRelay.sol";
import {ITxValidator} from "./lib/ITxValidator.sol";
import {IERC20Buyable} from "./IERC20Buyable.sol";
import {IERC20Sellable} from "./IERC20Sellable.sol";
import {ERC20Sellable} from "./ERC20Sellable.sol";
import {Bitcoin} from "./lib/BitcoinTypes.sol";

contract OptionPool is Context {
    using SafeMath for uint256;
    using IterableAddresses for IterableAddresses.List;

    string constant ERR_INVALID_OPTION = "Option does not exist";
    string constant ERR_ZERO_AMOUNT = "Requires non-zero amount";

    // backing asset (eg. Dai or USDC)
    IERC20 private _collateral;

    // btc relay
    IRelay private _relay;

    // tx validation
    ITxValidator private _validator;

    IterableAddresses.List private _options;

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
    ) external {
        ERC20Sellable option = new ERC20Sellable(
            _relay,
            _validator,
            _expiry,
            _premium,
            _strikePrice
        );
        _options.set(address(option));
    }

    function underwriteOption(address option, uint256 amount, bytes20 btcAddress, Bitcoin.Script script) external {
        require(_options.exists(option), ERR_INVALID_OPTION);
        require(amount > 0, ERR_ZERO_AMOUNT);
        address seller = _msgSender();
        IERC20Sellable(option).underwriteOption(seller, amount, btcAddress, script);
        _collateral.transferFrom(seller, address(this), amount);
    }

    function refundOption(address option) external {
        require(_options.exists(option), ERR_INVALID_OPTION);
        address seller = _msgSender();
        uint amount = IERC20Sellable(option).refundOption(seller);
        _collateral.transfer(seller, amount);
    }

    function insureOption(address option, address seller, uint256 satoshis) external {
        require(_options.exists(option), ERR_INVALID_OPTION);
        require(satoshis > 0, ERR_ZERO_AMOUNT);
        // require(seller != address(0), ERR_TRANSFER_FROM_ZERO_ADDRESS);

        address buyer = _msgSender();
        IERC20Sellable sellable = IERC20Sellable(option);

        // require the satoshis * premium
        uint256 premium = sellable.calculatePremium(satoshis);
        _collateral.transferFrom(buyer, seller, premium);

        sellable.insureOption(buyer, seller, satoshis);
    }

    function exerciseOption(
        address option,
        address seller,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external {
        require(_options.exists(option), ERR_INVALID_OPTION);
        address buyer = _msgSender();
        uint amount = IERC20Sellable(option).exerciseOption(
            buyer, seller, height, index, txid, proof, rawtx
        );
        _collateral.transfer(buyer, amount);
    }

    function getOptions() external view returns (address[] memory) {
        return _options.keys;
    }

    function getUserPurchasedOptions(address user) external view
        returns (
            address[] memory optionContracts,
            uint256[] memory purchasedOptions
        )
    {
        IterableAddresses.List storage list = _options;

        uint length = list.size();
        optionContracts = new address[](length);
        purchasedOptions = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            address key = list.getKeyAtIndex(i);
            IERC20Sellable sell = IERC20Sellable(key);
            IERC20Buyable buy = IERC20Buyable(sell.getBuyable());
            uint256 purchased = buy.balanceOf(user);
            if (purchased != 0) {
                optionContracts[i] = key;
                purchasedOptions[i] = purchased;
            }
        }

        return (optionContracts, purchasedOptions);
    }

    function getUserSoldOptions(address user) external view
        returns (
            address[] memory optionContracts,
            uint256[] memory unsoldOptions,
            uint256[] memory totalOptions
        )
    {
        IterableAddresses.List storage list = _options;

        uint length = list.size();
        optionContracts = new address[](length);
        unsoldOptions = new uint256[](length);
        totalOptions = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            address key = list.getKeyAtIndex(i);
            IERC20Sellable sell = IERC20Sellable(key);
            uint256 unsold = sell.balanceOf(user);
            uint256 total = sell.totalBalanceOf(user);

            if (unsold != 0 || total != 0) {
                optionContracts[i] = key;
                unsoldOptions[i] = unsold;
                totalOptions[i] = total;
            }
        }
        return (optionContracts, unsoldOptions, totalOptions);
    }
}
