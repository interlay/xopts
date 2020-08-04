// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { UniswapV2Router02 } from "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol";
import { UniswapV2Library } from "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";
import { TransferHelper } from '@uniswap/lib/contracts/libraries/TransferHelper.sol';
import { IOption } from "./interface/IOption.sol";
import { IObligation } from "./interface/IObligation.sol";
import { ITreasury } from "./interface/ITreasury.sol";
import { Bitcoin } from "./types/Bitcoin.sol";

/// @title OptionLib Helper
/// @author Interlay
/// @notice Helper contract to facilitate atomic option writing
/// and obligation purchases (as we require buyer collateralization).
contract OptionLib is UniswapV2Router02 {
    using SafeMath for uint256;

    string constant ERR_EXPECTED_COLLATERAL = "Expected collateral address";

    constructor(address _factory, address _WETH) public UniswapV2Router02(_factory, _WETH) {}

    function lockAndWrite(
        address tokenA, // options
        address tokenB, // premium
        address collateral,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        bytes20 btcHash,
        Bitcoin.Script format
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        // options, premium
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = UniswapV2Library.pairFor(factory, tokenA, tokenB);

        // lock collateral for exercising
        address treasury = IOption(tokenA).treasury();
        TransferHelper.safeTransferFrom(collateral, msg.sender, treasury, amountA);
        // deposit 'unlocked' balance for writing
        ITreasury(treasury).deposit(IOption(tokenA).obligation(), msg.sender);
        // mint options and obligations - locking collateral
        IOption(tokenA).mint(msg.sender, pair, amountA, btcHash, format);

        // send premium to uniswap pair
        TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IUniswapV2Pair(pair).mint(msg.sender);
    }

    function lockAndBuy(
        uint amountOut,
        uint amountInMax,
        address[] calldata path
    ) external returns (uint[] memory amounts) {
        address obligation = path[1];
        address treasury = IObligation(obligation).treasury();
        address collateral = ITreasury(treasury).collateral();
        require(path[0] == collateral, ERR_EXPECTED_COLLATERAL);

        TransferHelper.safeTransferFrom(collateral, msg.sender, treasury, amountOut);
        ITreasury(treasury).deposit(obligation, msg.sender);

        amounts = UniswapV2Library.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, 'EXCESSIVE_INPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            collateral, msg.sender, UniswapV2Library.pairFor(factory, collateral, obligation), amounts[0]
        );
        _swap(amounts, path, msg.sender);
    }

}
