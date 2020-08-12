// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import '@nomiclabs/buidler/console.sol';

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {IERC20} from '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol';
import {IReferee} from './interface/IReferee.sol';
import {Option} from './Option.sol';
import {IOption} from './interface/IOption.sol';
import {Obligation} from './Obligation.sol';
import {IObligation} from './interface/IObligation.sol';
import {IOptionPairFactory} from './interface/IOptionPairFactory.sol';
import {Treasury} from './Treasury.sol';

/// @title Parent Factory
/// @author Interlay
/// @notice Tracks and manages ERC20 Option pairs.
contract OptionPairFactory is IOptionPairFactory {
    using SafeMath for uint256;

    /// @notice Emit upon successful creation of a new option pair.
    event CreatePair(
        address indexed option,
        address indexed obligation,
        uint256 expiryTime,
        uint256 windowSize,
        uint256 strikePrice
    );

    mapping(address => address) public getObligation;
    mapping(address => address) public getTreasury;
    mapping(address => address) public getCollateral;
    address[] public options;

    function _createOption(
        uint8 decimals,
        uint256 expiryTime,
        uint256 windowSize,
        address obligation,
        bytes32 salt
    ) internal returns (address option) {
        bytes memory bytecode = type(Option).creationCode;
        assembly {
            // solhint-disable-previous-line no-inline-assembly
            // solium-disable-previous-line security/no-inline-assembly
            option := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IOption(option).initialize(
            decimals,
            expiryTime,
            windowSize,
            obligation
        );
        return option;
    }

    function _createObligation(
        uint8 decimals,
        uint256 expiryTime,
        uint256 windowSize,
        uint256 strikePrice,
        address referee,
        address treasury,
        bytes32 salt
    ) internal returns (address obligation) {
        bytes memory bytecode = type(Obligation).creationCode;
        assembly {
            // solhint-disable-previous-line no-inline-assembly
            // solium-disable-previous-line security/no-inline-assembly
            obligation := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IObligation(obligation).initialize(
            decimals,
            expiryTime,
            windowSize,
            strikePrice,
            referee,
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
        // load treasury for collateral type or create
        // a new treasury if it does not exist yet
        address treasury = getTreasury[collateral];
        if (treasury == address(0)) {
            // TODO: treasury create2?
            treasury = address(new Treasury(collateral));
        }

        // deterministic creation of option pair to ensure
        // that liquidity ends up in the same pool
        bytes32 salt = keccak256(
            abi.encodePacked(
                expiryTime,
                windowSize,
                strikePrice,
                collateral,
                referee
            )
        );

        // query the decimals of the collateral token to
        // ensure the option and obligation use the same
        // decmials precision.
        uint8 decimals = IERC20(collateral).decimals();

        obligation = _createObligation(
            decimals,
            expiryTime,
            windowSize,
            strikePrice,
            referee,
            treasury,
            salt
        );
        option = _createOption(
            decimals,
            expiryTime,
            windowSize,
            obligation,
            salt
        );
        Ownable(obligation).transferOwnership(option);

        getObligation[option] = obligation;
        getTreasury[collateral] = treasury;
        getCollateral[option] = collateral;
        options.push(option);

        emit CreatePair(
            option,
            obligation,
            expiryTime,
            windowSize,
            strikePrice
        );
    }

    function allOptions() external override view returns (address[] memory) {
        return options;
    }
}
