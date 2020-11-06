// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import 'hardhat/console.sol';

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {IERC20} from '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol';
import {IReferee} from './interface/IReferee.sol';
import {Option} from './Option.sol';
import {IOption} from './interface/IOption.sol';
import {Obligation} from './Obligation.sol';
import {IObligation} from './interface/IObligation.sol';
import {IOptionPairFactory} from './interface/IOptionPairFactory.sol';
import {ITreasury} from './interface/ITreasury.sol';

/// @title Parent Factory
/// @author Interlay
/// @notice Tracks and manages ERC20 Option pairs.
contract OptionPairFactory is IOptionPairFactory, Ownable {
    using SafeMath for uint256;

    string internal constant ERR_NO_TREASURY = 'No treasury found';
    string internal constant ERR_NOT_SUPPORTED = 'Collateral not supported';

    /// @notice Emit upon successful creation of a new option pair.
    event CreatePair(
        address option,
        address obligation,
        address collateral,
        uint256 expiryTime,
        uint256 windowSize,
        uint256 strikePrice
    );

    address internal uniswap;
    address[] public options;

    mapping(address => address) public getTreasury;

    constructor(address _uniswap) public Ownable() {
        uniswap = _uniswap;
    }

    mapping(address => bool) private isEnabled;

    function enableAsset(address collateral) external override onlyOwner {
        isEnabled[collateral] = true;
    }

    function disableAsset(address collateral) external override onlyOwner {
        isEnabled[collateral] = false;
    }

    function _createOption(
        uint8 decimals,
        uint256 expiryTime,
        uint256 windowSize,
        bytes32 salt
    ) internal returns (address option) {
        bytes memory bytecode = type(Option).creationCode;
        assembly {
            // solhint-disable-previous-line no-inline-assembly
            // solium-disable-previous-line security/no-inline-assembly
            option := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IOption(option).initialize(decimals, expiryTime, windowSize);
        return option;
    }

    function _createObligation(
        uint8 decimals,
        uint256 expiryTime,
        uint256 windowSize,
        uint256 strikePrice,
        address option,
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
            option,
            referee,
            treasury,
            uniswap
        );
        return obligation;
    }

    function setTreasuryFor(address collateral, address treasury)
        external
        onlyOwner
    {
        // treasury must be created separately due to the contract
        // size limit of 24576 bytes
        getTreasury[collateral] = treasury;
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
        // fail early if the collateral asset has not been whitelisted
        require(isEnabled[collateral], ERR_NOT_SUPPORTED);

        // load treasury for collateral type
        address treasury = getTreasury[collateral];
        require(treasury != address(0), ERR_NO_TREASURY);

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

        option = _createOption(decimals, expiryTime, windowSize, salt);
        obligation = _createObligation(
            decimals,
            expiryTime,
            windowSize,
            strikePrice,
            option,
            referee,
            treasury,
            salt
        );
        Ownable(option).transferOwnership(obligation);
        ITreasury(treasury).authorize(obligation);
        options.push(option);

        emit CreatePair(
            option,
            obligation,
            collateral,
            expiryTime,
            windowSize,
            strikePrice
        );
    }

    function allOptions() external override view returns (address[] memory) {
        return options;
    }
}
