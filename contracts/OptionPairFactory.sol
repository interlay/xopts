// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { IUniswapV2Factory } from "./lib/IUniswapV2Factory.sol";
import { IReferee } from "./interface/IReferee.sol";
import { Bitcoin } from "./types/Bitcoin.sol";
import { Option } from "./Option.sol";
import { IOption } from "./interface/IOption.sol";
import { Obligation } from "./Obligation.sol";
import { IObligation } from "./interface/IObligation.sol";
import { IOptionPairFactory } from "./interface/IOptionPairFactory.sol";
import { Treasury } from "./Treasury.sol";
import { ITreasury } from "./interface/ITreasury.sol";

/// @title Parent Factory
/// @author Interlay
/// @notice Tracks and manages ERC20 Option pairs.
contract OptionPairFactory is IOptionPairFactory {
    using SafeMath for uint256;

    string constant ERR_INVALID_OPTION = "Option does not exist";
    string constant ERR_ZERO_AMOUNT = "Requires non-zero amount";
    string constant ERR_NO_BTC_ADDRESS = "Insurer lacks BTC address";

    /// @notice Emitted whenever this factory creates a new option pair.
    event Create(address indexed option, address indexed obligation, uint256 expiryTime, uint256 windowSize, uint256 strikePrice);

    mapping(address => address) public getObligation;
    mapping(address => address) public getTreasury;
    mapping(address => address) public getCollateral;
    address[] public options;

    mapping (address => Bitcoin.Address) internal _btcAddresses;

    /**
    * @notice Sets the preferred payout address for the caller.
    *
    * The script format is defined by the `Bitcoin.Script` enum which describes
    * the expected output format (P2SH, P2PKH, P2WPKH).
    *
    * @param btcHash Address hash
    * @param format Payment format
    **/
    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external override {
        require(
            btcHash != 0,
            ERR_NO_BTC_ADDRESS
        );
        _btcAddresses[msg.sender].btcHash = btcHash;
        _btcAddresses[msg.sender].format = format;
    }

    /**
    * @notice Get the preferred BTC address for the caller.
    * @return btcHash Address hash
    * @return format Payment format
    **/
    function getBtcAddress() external override view returns (bytes20 btcHash, Bitcoin.Script format) {
        return (_btcAddresses[msg.sender].btcHash, _btcAddresses[msg.sender].format);
    }

    function _createOption(
        uint256 expiryTime,
        uint256 windowSize,
        address referee,
        address treasury,
        address obligation,
        bytes32 salt
    ) internal returns (address option) {
        bytes memory bytecode = type(Option).creationCode;
        assembly {
            // solium-disable-previous-line security/no-inline-assembly
            option := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IOption(option).initialize(
            expiryTime,
            windowSize,
            referee,
            treasury,
            obligation
        );
        return option;
    }

    function _createObligation(
        uint256 expiryTime,
        uint256 windowSize,
        uint256 strikePrice,
        address treasury,
        bytes32 salt
    ) internal returns (address obligation) {
        bytes memory bytecode = type(Obligation).creationCode;
        assembly {
            // solium-disable-previous-line security/no-inline-assembly
            obligation := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IObligation(obligation).initialize(
            expiryTime,
            windowSize,
            strikePrice,
            treasury
        );
        return obligation;
    }

    /**
    * @notice Creates a new option pair with the given parameters. If no
    * treasury contract exists for the associated collateral address a new one
    * is made and registered. The ownership of the obligation-side contract is
    * immediately transferred to the option-side contract.
    * @param expiryTime Unix expiry date
    * @param windowSize Settlement window
    * @param strikePrice Strike price
    * @param collateral Backing currency
    * @param referee Underlying settlement
    **/
    function createPair(
        uint256 expiryTime,
        uint256 windowSize,
        uint256 strikePrice,
        address collateral,
        address referee
    ) external override returns (address option, address obligation) {
        address treasury = getTreasury[collateral];
        if (treasury == address(0)) {
            treasury = address(new Treasury(collateral));
        }

        bytes32 salt = keccak256(abi.encodePacked(
            expiryTime,
            windowSize,
            strikePrice,
            collateral,
            referee
        ));

        obligation = _createObligation(expiryTime, windowSize, strikePrice, treasury, salt);
        option = _createOption(expiryTime, windowSize, referee, treasury, obligation, salt);
        Ownable(obligation).transferOwnership(option);

        getObligation[option] = obligation;
        getTreasury[collateral] = treasury;
        getCollateral[option] = collateral;
        options.push(option);

        emit Create(option, obligation, expiryTime, windowSize, strikePrice);
    }

}
