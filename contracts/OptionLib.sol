// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import 'hardhat/console.sol';

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
import {IWriterRegistry} from './interface/IWriterRegistry.sol';
import {Bitcoin} from './types/Bitcoin.sol';

/// @title OptionLib Helper
/// @author Interlay
/// @notice Helper contract to facilitate atomic option writing
/// and obligation purchases (as we require buyer collateralization).
contract OptionLib is UniswapV2Router02 {
    using SafeMath for uint256;

    string
        internal constant ERR_EXPECTED_COLLATERAL = 'Expected collateral address';
    string
        internal constant ERR_NOT_REGISTERED = 'BTC address is not registered with Treasury';

    constructor(address _factory, address _weth)
        public
        UniswapV2Router02(_factory, _weth)
    {
        // solhint-disable-previous-line no-empty-blocks
    }

    /// @dev If minStrike and maxStrike are zero, no position is set. (If one exists,
    /// it's reused, else the transaction will error and revert.)
    function _deposit(
        address obligation,
        address collateral,
        address writer,
        uint256 optionsAmount,
        uint256 minStrike,
        uint256 maxStrike,
        uint256 expiryTime
    ) internal {
        // lock collateral for exercising
        address treasury = IObligation(obligation).treasury();

        // 1. set position if necessary
        if (
            (minStrike == 0 && maxStrike == 0 && expiryTime == 0) && // if no override passed...
            (!ITreasury(treasury).hasValidPosition(writer)) // and no existing position exists...
        ) {
            // then tailor a position to the desired obligation
            (
                uint256 expiry,
                uint256 window,
                uint256 strike,
                ,
                ,

            ) = IObligation(obligation).getDetails();

            minStrike = maxStrike = strike;
            expiryTime = expiry + window;
        }
        if (minStrike != 0 || maxStrike != 0 || expiryTime != 0) {
            // if a position was either passed, or set above, then set it
        }
        (bytes20 btcHash, Bitcoin.Script format) = IWriterRegistry(treasury)
            .getBtcAddress(writer);
        console.log('Setting position');
        console.logBytes20(btcHash);
        ITreasury(treasury).position(
            minStrike,
            maxStrike,
            expiryTime,
            btcHash,
            format
        );

        // 2. send funds for deposit
        TransferHelper.safeTransferFrom(
            collateral,
            writer,
            treasury,
            optionsAmount
        );

        // 3. deposit 'unlocked' balance for writing
        ITreasury(treasury).deposit(writer);
    }

    /// @notice Allows a user to ensure they are registered (as a writer with a BTC
    /// address) with a given Obligation's Treasury.
    /// @param obligation The obligation the user wishes to write.
    /// @return registered True if the writer is registered; false otherwise.
    /// @return treasury The treasury against which registration was checked (and must be performed if necessary).
    function isRegisteredFor(address obligation)
        external
        returns (bool registered, address treasury)
    {
        treasury = IObligation(obligation).treasury();
        (bytes20 btcHash, ) = IWriterRegistry(treasury).getBtcAddress(
            msg.sender
        );
        registered = (btcHash != 0);
    }

    /// @notice Atomically deposit collateral into a treasury and add liquidity to a
    /// Uniswap pair based on the specified premium. If the writer has a specified position,
    /// preserves it, otherwise sets it to match the specified obligation.
    /// @dev This is a wrapper around lockAndWriteToPoolWithPosition.
    /// The output `optionsAmount` describes both the number of option tokens minted
    /// as well as the total amount of collateral transferred.
    function lockAndWriteToPool(
        address obligation,
        address premium,
        address collateral,
        uint256 optionsDesired,
        uint256 premiumDesired,
        uint256 optionsMin,
        uint256 premiumMin
    ) external returns (uint256 optionsAmount, uint256 premiumAmount) {
        return
            lockAndWriteToPoolWithPosition(
                obligation,
                premium,
                collateral,
                optionsDesired,
                premiumDesired,
                optionsMin,
                premiumMin,
                0,
                0,
                0
            );
    }

    /// @notice Atomically deposit collateral into a treasury and add liquidity to a
    /// Uniswap pair based on the specified premium. Sets the writer's position (for
    /// future collateral reuse) to the specified parameters.
    /// @dev The output `optionsAmount` describes both the number of option tokens minted
    /// as well as the total amount of collateral transferred.
    /// Additionally, if maxStrike, minStrike and expiry are all zero, IF no position exist
    /// then one is set to match the obligation ELSE the existing position is left untouched.
    /// Consider calling lockAndWriteToPool for this case.
    function lockAndWriteToPoolWithPosition(
        address obligation,
        address premium,
        address collateral,
        uint256 optionsDesired,
        uint256 premiumDesired,
        uint256 optionsMin,
        uint256 premiumMin,
        uint256 minStrike,
        uint256 maxStrike,
        uint256 expiry
    ) public returns (uint256 optionsAmount, uint256 premiumAmount) {
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

        _deposit(
            obligation,
            collateral,
            msg.sender,
            optionsAmount,
            minStrike,
            maxStrike,
            expiry
        );

        address pair = UniswapV2Library.pairFor(factory, option, premium);
        // send premium to uniswap pair
        TransferHelper.safeTransferFrom(
            premium,
            msg.sender,
            pair,
            premiumAmount
        );

        // mint options and obligations - locking collateral
        IObligation(obligation).mintToPool(msg.sender, optionsAmount);
    }

    /// @notice Atomically deposit collateral into a treasury and directly credit
    /// the writer with the resulting options. Only sets the writer's position --- to
    /// one tailored to the selected obligation --- none is already set.
    /// @dev This is a wrapper around lockAndWriteToWriterWithPosition.
    function lockAndWriteToWriter(
        address obligation,
        address collateral,
        uint256 optionsAmount
    ) external {
        lockAndWriteToWriterWithPosition(
            obligation,
            collateral,
            optionsAmount,
            0,
            0,
            0
        );
    }

    /// @notice Atomically deposit collateral into a treasury and directly credit
    /// the writer with the resulting options. Sets the writer's position for future
    /// collateral reuse.
    /// @param obligation The obligation tokens
    /// @param collateral The collateral tokens
    /// @param optionsAmount The amount of options that will be minted (hence the amount of collateral that must be locked)
    /// @param minStrike The minimum strike price to set the position to
    /// @param maxStrike The maximum strike price to set the position to
    /// @param expiryTime The set position expiry time
    function lockAndWriteToWriterWithPosition(
        address obligation,
        address collateral,
        uint256 optionsAmount,
        uint256 minStrike,
        uint256 maxStrike,
        uint256 expiryTime
    ) public {
        _deposit(
            obligation,
            collateral,
            msg.sender,
            optionsAmount,
            minStrike,
            maxStrike,
            expiryTime
        );
        // mint options and obligations - locking collateral
        IObligation(obligation).mintToWriter(msg.sender, optionsAmount);
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
        IObligation(obligationB).mintToPool(writer, optionsAmount);

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

    /// @notice Reuses existing (expired) collateral to write a new option,
    /// crediting the collateral provider directly.
    /// @param obligationA The expired obligation whose collateral is to be reused
    /// @param obligationB The new obligation, for which options will be written
    /// @param writer The writer whose obligationA collateral will be reused
    /// @param optionsAmount The amount of obligationB options to write and credit to the writer
    function unlockAndMintToWriter(
        address obligationA,
        address obligationB,
        address writer,
        uint256 optionsAmount
    ) external {
        // reuse alice's collateral
        address treasury = IObligation(obligationA).treasury();
        ITreasury(treasury).unlock(obligationA, writer, optionsAmount);

        // relock collateral and mint options / obligations
        IObligation(obligationB).mintToWriter(writer, optionsAmount);
    }

    /// @notice Atomically deposit collateral into a treasury and purchase `amountOut`
    /// obligations from a Uniswap pool.
    /// @dev TODO: needs position manually set prior to buying; decide whether this is right.
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
