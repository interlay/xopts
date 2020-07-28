// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IUniswapV2Factory } from "./lib/IUniswapV2Factory.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { IOption } from "./interface/IOption.sol";
import { IObligation } from "./interface/IObligation.sol";
import { ITreasury } from "./interface/ITreasury.sol";
import { IOptionPairFactory } from "./interface/IOptionPairFactory.sol";
import { Bitcoin } from "./Bitcoin.sol";

/// @title OptionLib Helper
/// @author Interlay
/// @notice Helper contract to facilitate atomic option writing
/// and obligation purchases (as we require buyer collateralization).
contract OptionLib {
    using SafeMath for uint256;

    address internal _uniswapFactory;
    address internal _optionFactory;

    constructor(address uniswapFactory, address optionFactory) public {
        _uniswapFactory = uniswapFactory;
        _optionFactory = optionFactory;
    }

    function getReserves(address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        (uint reserve0, uint reserve1,) = IUniswapV2Pair(IUniswapV2Factory(_uniswapFactory).getPair(tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    /// @notice Sell Order
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address input,
        address output
    ) external {
        (uint reserveIn, uint reserveOut) = getReserves(input, output);

        uint amountInWithFee = amountIn.mul(997);
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(1000).add(amountInWithFee);
        uint amountOut = numerator / denominator;

        require(amountOut >= amountOutMin, 'INSUFFICIENT_OUTPUT_AMOUNT');
        address pair = IUniswapV2Factory(_uniswapFactory).getPair(input, output);
        IERC20(input).transferFrom(msg.sender, pair, amountIn);

        (address token0,) = input < output ? (input, output) : (output, input);
        (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, msg.sender, new bytes(0));
    }

    /// @notice Buy Order
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address input,
        address output
    ) public {
        (uint reserveIn, uint reserveOut) = getReserves(input, output);

        uint numerator = reserveIn.mul(amountOut).mul(1000);
        uint denominator = reserveOut.sub(amountOut).mul(997);
        uint amountIn = (numerator / denominator).add(1);

        require(amountIn <= amountInMax, 'EXCESSIVE_INPUT_AMOUNT');
        address pair = IUniswapV2Factory(_uniswapFactory).getPair(input, output);
        IERC20(input).transferFrom(msg.sender, pair, amountIn);

        (address token0,) = input < output ? (input, output) : (output, input);
        (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, msg.sender, new bytes(0));
    }

    function quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB) {
        require(amountA > 0, 'INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'INSUFFICIENT_LIQUIDITY');
        amountB = amountA.mul(reserveB) / reserveA;
    }

    /**
    * @notice Add liquidity to a pool
    * @dev Requires pre-approval for input coins
    * @param tokenA ECR-20 contract address
    * @param tokenB ERC-20 contract address
    * @param amountADesired Initial token
    * @param amountBDesired Initial token
    * @param amountAMin Initial token
    * @param amountBMin Initial token
    * @return amountA Final
    * @return amountB Final
    * @return liquidity Final
    */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        address pair = IUniswapV2Factory(_uniswapFactory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IUniswapV2Factory(_uniswapFactory).createPair(tokenA, tokenB);
        }

        (uint reserveA, uint reserveB) = getReserves(tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, 'INSUFFICIENT_B_AMOUNT');
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, 'INSUFFICIENT_A_AMOUNT');
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
        // console.log(amountA, amountB);
        IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountB);
        liquidity = IUniswapV2Pair(pair).mint(msg.sender);
    }

    function lockAndWrite(
        address option,
        uint256 premium,
        uint256 amount,
        bytes20 btcHash,
        Bitcoin.Script format
    ) external returns (uint) {
        address obligation = IOption(option).obligation();
        address treasury = IOption(option).treasury();
        address collateral = ITreasury(treasury).collateral();

        address pair = IUniswapV2Factory(_uniswapFactory).getPair(option, collateral);
        if (pair == address(0)) {
            pair = IUniswapV2Factory(_uniswapFactory).createPair(option, collateral);
        }

        // TODO: safety checks

        // lock collateral for exercising
        IERC20(collateral).transferFrom(msg.sender, treasury, amount);
        // deposit 'unlocked' balance for writing
        ITreasury(treasury).deposit(obligation, msg.sender);
        // mint options and obligations - locking collateral
        IOptionPairFactory(_optionFactory).writeOption(option, msg.sender, pair, amount, btcHash, format);

        // send premium to uniswap pair
        IERC20(collateral).transferFrom(msg.sender, pair, premium);
        return IUniswapV2Pair(pair).mint(msg.sender);
    }

    function lockAndBuy(
        address obligation,
        uint amountOut,
        uint amountInMax
    ) external {
        address treasury = IObligation(obligation).treasury();
        address collateral = ITreasury(treasury).collateral();
        IERC20(collateral).transferFrom(msg.sender, treasury, amountOut);
        ITreasury(treasury).deposit(obligation, msg.sender);
        swapTokensForExactTokens(amountOut, amountInMax, collateral, obligation);
    }

}
