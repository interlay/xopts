pragma solidity ^0.5.15;

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";
import { Context } from "@openzeppelin/contracts/GSN/Context.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

import "@nomiclabs/buidler/console.sol";
// import {IRelay} from "./lib/IRelay.sol";
// import {ITxValidator} from "./lib/ITxValidator.sol";
// import {IERC20Buyable} from "./IERC20Buyable.sol";
// import {IERC20Sellable} from "./IERC20Sellable.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IterableAddresses } from "./IterableAddresses.sol";
import { IReferee } from "./interface/IReferee.sol";
import { Bitcoin } from "./Bitcoin.sol";

import { IUniswapV2Factory } from "./lib/IUniswapV2Factory.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

import { Option } from "./Option.sol";
import { IOption } from "./interface/IOption.sol";

import { Obligation } from "./Obligation.sol";
import { IObligation } from "./interface/IObligation.sol";

import { Treasury } from "./Treasury.sol";
import { ITreasury } from "./interface/ITreasury.sol";

// named due to typechain collision
contract Broker is Context {
    using SafeMath for uint256;

    string constant ERR_INVALID_OPTION = "Option does not exist";
    string constant ERR_ZERO_AMOUNT = "Requires non-zero amount";

    mapping(address => address) public getPair;
    mapping(address => address) public getTreasury;
    address[] public options;

    address internal _uniswap;

    constructor(address uniswap) public {
        _uniswap = uniswap;
    }

    /**
     * @dev Create an option pair
     * @param expiry Unix timestamp
     * @param strikePrice Amount of collateral to payout per token
     **/
    function createOption(
        uint256 expiry,
        uint256 window,
        uint256 strikePrice,
        address referee,
        address collateral
    ) external {
        address obligation = address(new Obligation(expiry, window));
        address option = address(new Option(
            expiry,
            window,
            strikePrice,
            referee,
            collateral
        ));

        getPair[option] = obligation;
        // getPair[obligation] = option;
        options.push(option);

        if (getTreasury[collateral] == address(0)) {
            getTreasury[collateral] = address(new Treasury(collateral));
        }
    }

    function writeOption(address option, uint256 premium, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external returns (uint) {
        address obligation = getPair[option];
        require(obligation != address(0), ERR_INVALID_OPTION);
        require(premium > 0 && amount > 0, ERR_ZERO_AMOUNT);

        address writer = _msgSender();
        address collateral = address(IOption(option).collateral());

        address pair = IUniswapV2Factory(_uniswap).getPair(option, collateral);
        if (pair == address(0)) {
            pair = IUniswapV2Factory(_uniswap).createPair(option, collateral);
        }

        // TODO: safety checks

        // lock collateral for exercising
        // ITreasury(getTreasury[collateral]).lock(writer, amount);
        IERC20(collateral).transferFrom(writer, address(this), amount);

        // collateral:options are 1:1
        IOption(option).mint(pair, amount, btcHash, format);
        // mint the equivalent obligations
        IObligation(obligation).mint(writer, amount, btcHash, format);

        // send premium to uniswap pair
        IERC20(collateral).transferFrom(writer, pair, premium);
        return IUniswapV2Pair(pair).mint(writer);
    }

    function exerciseOption(
        address option,
        address seller,
        uint256 amount,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external {
        address obligation = getPair[option];
        require(obligation != address(0), ERR_INVALID_OPTION);
        address buyer = _msgSender();

        // burn seller's obligations
        IObligation(obligation).exercise(seller, amount);

        IOption(option).exercise(
            buyer, seller, amount, height, index, txid, proof, rawtx
        );
        address collateral = IOption(option).collateral();
        // transfers from this contract to the buyer
        IERC20(collateral).transfer(buyer, amount);
    }

    function refundOption(address option, uint amount) external {
        address obligation = getPair[option];
        require(obligation != address(0), ERR_INVALID_OPTION);
        address writer = _msgSender();

        // burn writer's obligations
        IObligation(obligation).refund(writer, amount);

        // address collateral = IOption(option).collateral();
        // IERC20(collateral).transfer(writer, amount);
    }

    // function getUserPurchasedOptions(address user) external view
    //     returns (
    //         address[] memory optionContracts,
    //         uint256[] memory purchasedOptions
    //     )
    // {
    //     IterableAddresses.List storage list = _options;

    //     uint length = list.size();
    //     optionContracts = new address[](length);
    //     purchasedOptions = new uint256[](length);

    //     for (uint i = 0; i < length; i++) {
    //         address key = list.getKeyAtIndex(i);
    //         IERC20Sellable sell = IERC20Sellable(key);
    //         IERC20Buyable buy = IERC20Buyable(sell.getBuyable());
    //         uint256 purchased = buy.balanceOf(user);
    //         if (purchased != 0) {
    //             optionContracts[i] = key;
    //             purchasedOptions[i] = purchased;
    //         }
    //     }

    //     return (optionContracts, purchasedOptions);
    // }

    // function getUserSoldOptions(address user) external view
    //     returns (
    //         address[] memory optionContracts,
    //         uint256[] memory unsoldOptions,
    //         uint256[] memory totalOptions
    //     )
    // {
    //     IterableAddresses.List storage list = _options;

    //     uint length = list.size();
    //     optionContracts = new address[](length);
    //     unsoldOptions = new uint256[](length);
    //     totalOptions = new uint256[](length);

    //     for (uint i = 0; i < length; i++) {
    //         address key = list.getKeyAtIndex(i);
    //         IERC20Sellable sell = IERC20Sellable(key);
    //         uint256 unsold = sell.balanceOf(user);
    //         uint256 total = sell.totalBalanceOf(user);

    //         if (unsold != 0 || total != 0) {
    //             optionContracts[i] = key;
    //             unsoldOptions[i] = unsold;
    //             totalOptions[i] = total;
    //         }
    //     }
    //     return (optionContracts, unsoldOptions, totalOptions);
    // }
}
