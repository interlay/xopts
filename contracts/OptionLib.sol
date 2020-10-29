// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import '@nomiclabs/buidler/console.sol';

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {
    IUniswapV2Pair
} from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import {
    UniswapV2Router02
} from '@uniswap/v2-periphery/contracts/UniswapV2Router02.sol';
import {
    UniswapV2Library
} from '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import {
    TransferHelper
} from '@uniswap/lib/contracts/libraries/TransferHelper.sol';
import {IOption} from './interface/IOption.sol';
import {IObligation} from './interface/IObligation.sol';
import {ITreasury} from './interface/ITreasury.sol';
import {Bitcoin} from './types/Bitcoin.sol';

/// @title OptionLib Helper
/// @author Interlay
/// @notice Helper contract to facilitate atomic option writing
/// and obligation purchases (as we require buyer collateralization).
contract OptionLib is UniswapV2Router02 {
    using SafeMath for uint256;

    string
        internal constant ERR_EXPECTED_COLLATERAL = 'Expected collateral address';

    constructor(address _factory, address _weth)
        public
        UniswapV2Router02(_factory, _weth)
    {
        // solhint-disable-previous-line no-empty-blocks
    }

    function _deposit(
        address obligation,
        address collateral,
        address writer,
        uint256 optionsAmount
    ) internal {
        // lock collateral for exercising
        address treasury = IObligation(obligation).treasury();
        TransferHelper.safeTransferFrom(
            collateral,
            writer,
            treasury,
            optionsAmount
        );
        // deposit 'unlocked' balance for writing
        ITreasury(treasury).deposit(writer);
    }

    /// @notice Atomically deposit collateral into a treasury and add liquidity to a
    /// Uniswap pair based on the specified premium.
    /// @dev The output `optionsAmount` describes both the number of option tokens minted
    /// as well as the total amount of collateral transferred.
    function lockAndWrite(
        address obligation,
        address premium,
        address collateral,
        uint256 optionsDesired,
        uint256 premiumDesired,
        uint256 optionsMin,
        uint256 premiumMin
    ) external returns (uint256 optionsAmount, uint256 premiumAmount) {
        address option = IObligation(obligation).option();

        // options, premium
        (optionsAmount, premiumAmount) = _addLiquidity(
            option,
            premium,
            optionsDesired,
            premiumDesired,
            optionsMin,
            premiumMin
        );

        _deposit(obligation, collateral, msg.sender, optionsAmount);

        address pair = UniswapV2Library.pairFor(factory, option, premium);
        // send premium to uniswap pair
        TransferHelper.safeTransferFrom(
            premium,
            msg.sender,
            pair,
            premiumAmount
        );

        // mint options and obligations - locking collateral
        IObligation(obligation).mint(msg.sender, optionsAmount);
    }

    /// @notice Redistribute collateral subject to position.
    function unlockAndMintAndBuy(
        address obligationA,
        address obligationB,
        address premium,
        address writer,
        uint256 optionsDesired,
        uint256 premiumDesired,
        uint256 optionsMin,
        uint256 premiumMin,
        uint256 amountOut,
        uint256 amountInMax
    ) external returns (uint256 optionsAmount, uint256 premiumAmount) {
        address optionB = IObligation(obligationB).option();

        // options, premium
        (optionsAmount, premiumAmount) = _addLiquidity(
            optionB,
            premium,
            optionsDesired,
            premiumDesired,
            optionsMin,
            premiumMin
        );

        // reuse alice's collateral
        address treasury = IObligation(obligationA).treasury();
        ITreasury(treasury).unlock(obligationA, writer, optionsAmount);

        address pair = UniswapV2Library.pairFor(factory, premium, optionB);
        // send premium to uniswap pair
        TransferHelper.safeTransferFrom(
            premium,
            msg.sender,
            pair,
            premiumAmount
        );

        // relock collateral and mint options / obligations
        IObligation(obligationB).mint(writer, optionsAmount);

        address[] memory path = new address[](2);
        path[0] = premium;
        path[1] = optionB;
        // throws 'invalid opcode' when a divide by zero is encountered
        uint256[] memory amounts = UniswapV2Library.getAmountsIn(
            factory,
            amountOut,
            path
        );
        require(amounts[0] <= amountInMax, 'EXCESSIVE_INPUT_AMOUNT');
        TransferHelper.safeTransferFrom(premium, msg.sender, pair, amounts[0]);
        _swap(amounts, path, msg.sender);
    }

    /// @notice Atomically deposit collateral into a treasury and purchase `amountOut`
    /// obligations from a Uniswap pool.
    function lockAndBuy(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path
    ) external returns (uint256[] memory amounts) {
        address obligation = path[1];
        address treasury = IObligation(obligation).treasury();
        address collateral = ITreasury(treasury).collateral();
        require(path[0] == collateral, ERR_EXPECTED_COLLATERAL);

        // store collateral
        TransferHelper.safeTransferFrom(
            collateral,
            msg.sender,
            treasury,
            amountOut
        );
        ITreasury(treasury).deposit(msg.sender);

        amounts = UniswapV2Library.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, 'EXCESSIVE_INPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            collateral,
            msg.sender,
            UniswapV2Library.pairFor(factory, collateral, obligation),
            amounts[0]
        );
        _swap(amounts, path, msg.sender);
    }

    function getPairAddress(address option, address premium)
        public
        view
        returns (address)
    {
        return UniswapV2Library.pairFor(factory, option, premium);
    }
}
