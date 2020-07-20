pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";
import { Context } from "@openzeppelin/contracts/GSN/Context.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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

/// @title Parent option factory
/// @author Interlay
contract OptionPairFactory is Context {
    using SafeMath for uint256;

    string constant ERR_INVALID_OPTION = "Option does not exist";
    string constant ERR_ZERO_AMOUNT = "Requires non-zero amount";

    mapping(address => address) public getObligation;
    mapping(address => address) public getTreasury;
    mapping(address => address) public getCollateral;
    address[] public options;
    address internal _uniswap;

    constructor(address uniswap) public {
        _uniswap = uniswap;
    }

    /**
    * @notice Create an option pair
    * @param expiry Unix expiry date
    * @param window Settlement window
    * @param strikePrice Strike price
    * @param referee Underlying settlement
    * @param collateral Backing currency
    **/
    function createOption(
        uint256 expiry,
        uint256 window,
        uint256 strikePrice,
        address referee,
        address collateral
    ) external {
        address treasury = getTreasury[collateral];
        if (treasury == address(0)) {
            treasury = address(new Treasury(collateral));
        }

        address obligation = address(new Obligation(expiry, window));
        address option = address(new Option(
            expiry,
            window,
            strikePrice,
            referee,
            treasury,
            obligation
        ));
        Ownable(obligation).transferOwnership(option);

        getObligation[option] = obligation;
        getTreasury[collateral] = treasury;
        getCollateral[option] = collateral;
        options.push(option);
    }

    /**
    * @notice Underwrite an option pair
    * @param option Option contract address
    * @param premium Initial exchange input
    * @param amount Collateral amount
    * @param btcHash Bitcoin address hash
    * @param format Bitcoin script format
    **/
    function writeOption(address option, uint256 premium, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external returns (uint) {
        require(getObligation[option] != address(0), ERR_INVALID_OPTION);
        require(premium > 0 && amount > 0, ERR_ZERO_AMOUNT);

        address writer = _msgSender();
        address collateral = getCollateral[option];

        address pair = IUniswapV2Factory(_uniswap).getPair(option, collateral);
        if (pair == address(0)) {
            pair = IUniswapV2Factory(_uniswap).createPair(option, collateral);
        }

        // TODO: safety checks

        // lock collateral for exercising
        IERC20(collateral).transferFrom(writer, getTreasury[collateral], amount);

        // collateral:options are 1:1
        IOption(option).mint(writer, pair, amount, btcHash, format);

        // send premium to uniswap pair
        IERC20(collateral).transferFrom(writer, pair, premium);
        return IUniswapV2Pair(pair).mint(writer);
    }

    /**
    * @notice Exercise bought option tokens
    * @param option Option contract address
    * @param seller Account to settle against
    * @param amount Options to burn for collateral
    * @param height Bitcoin block height
    * @param index Bitcoin tx index
    * @param txid Bitcoin transaction id
    * @param proof Bitcoin inclusion proof
    * @param rawtx Bitcoin raw tx
    **/
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
        require(getObligation[option] != address(0), ERR_INVALID_OPTION);
        address buyer = _msgSender();

        IOption(option).exercise(
            buyer, seller, amount, height, index, txid, proof, rawtx
        );
        // transfers from the treasury to the buyer
        ITreasury(getTreasury[getCollateral[option]]).unlock(buyer, amount);
    }

    /**
    * @notice Refund expired options
    * @param option Option contract address
    * @param amount Options to burn for collateral
    **/
    function refundOption(address option, uint amount) external {
        require(getObligation[option] != address(0), ERR_INVALID_OPTION);

        address writer = _msgSender();

        // burn writer's obligations
        IOption(option).refund(writer, amount);

        ITreasury(getTreasury[getCollateral[option]]).unlock(writer, amount);
    }

}
