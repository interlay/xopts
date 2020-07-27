// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
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
import { IOptionPairFactory } from "./interface/IOptionPairFactory.sol";

/// @title Parent option factory
/// @author Interlay
contract OptionPairFactory is IOptionPairFactory, Context {
    using SafeMath for uint256;

    string constant ERR_INVALID_OPTION = "Option does not exist";
    string constant ERR_ZERO_AMOUNT = "Requires non-zero amount";
    string constant ERR_NO_BTC_ADDRESS = "Insurer lacks BTC address";

    event Create(address indexed option, uint256 expiryTime, uint256 windowSize, uint256 strikePrice);

    mapping(address => address) public getObligation;
    mapping(address => address) public getTreasury;
    mapping(address => address) public getCollateral;
    address[] public options;

    mapping (address => Bitcoin.Address) internal _btcAddresses;

    function _setBtcAddress(address account, bytes20 btcHash, Bitcoin.Script format) internal {
        require(
            btcHash != 0,
            ERR_NO_BTC_ADDRESS
        );
        _btcAddresses[account].btcHash = btcHash;
        _btcAddresses[account].format = format;
    }

    /// @dev See {IOptionPairFactory-setBtcAddress}
    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external override {
        _setBtcAddress(_msgSender(), btcHash, format);
    }

    /// @dev See {IOptionPairFactory-getBtcAddress}
    function getBtcAddress() external override view returns (bytes20 btcHash, Bitcoin.Script format) {
        return (_btcAddresses[_msgSender()].btcHash, _btcAddresses[_msgSender()].format);
    }

    /**
    * @notice Create an option pair
    * @param expiryTime Unix expiry date
    * @param windowSize Settlement window
    * @param strikePrice Strike price
    * @param collateral Backing currency
    * @param referee Underlying settlement
    **/
    function createOption(
        uint256 expiryTime,
        uint256 windowSize,
        uint256 strikePrice,
        address collateral,
        address referee
    ) external override {
        address treasury = getTreasury[collateral];
        if (treasury == address(0)) {
            treasury = address(new Treasury(collateral));
        }

        address obligation = address(new Obligation(
            expiryTime,
            windowSize,
            treasury
        ));
        address option = address(new Option(
            expiryTime,
            windowSize,
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

        emit Create(option, expiryTime, windowSize, strikePrice);
    }

    /**
    * @notice Underwrite an option pair
    * @param option Option contract address
    * @param from Address of input account
    * @param to Address of output account
    * @param amount Collateral amount
    * @param btcHash Bitcoin address hash
    * @param format Bitcoin script format
    **/
    function writeOption(address option, address from, address to, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external override {
        // obligation is responsible for locking with treasury
        address obligation = getObligation[option];
        require(obligation != address(0), ERR_INVALID_OPTION);
        require(amount > 0, ERR_ZERO_AMOUNT);

        _setBtcAddress(from, btcHash, format);

        // collateral:(options/obligations) are 1:1
        IOption(option).mint(from, to, amount, btcHash, format);
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
    ) external override {
        address obligation = getObligation[option];
        require(obligation != address(0), ERR_INVALID_OPTION);
        address buyer = _msgSender();

        // validate tx and burn options
        IOption(option).exercise(
            buyer, seller, amount, height, index, txid, proof, rawtx
        );
    }

    /**
    * @notice Refund expired options
    * @param option Option contract address
    * @param amount Options to burn for collateral
    **/
    function refundOption(address option, uint amount) external override {
        address obligation = getObligation[option];
        require(obligation != address(0), ERR_INVALID_OPTION);

        address writer = _msgSender();

        // burn writer's obligations
        // should revert if not expired
        IOption(option).refund(writer, amount);
    }

}
