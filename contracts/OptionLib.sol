pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IUniswapV2Factory } from "./lib/IUniswapV2Factory.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { IOption } from "./interface/Option.sol";

contract OptionLib {
    using SafeMath for uint256;

    address internal _uniswap;

    constructor(address uniswap) public {
        _uniswap = uniswap;
    }

    function getReserves(address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        (uint reserve0, uint reserve1,) = IUniswapV2Pair(IUniswapV2Factory(_uniswap).getPair(tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    function swapTokensForExactTokens(
        address option,
        uint amountOut,
        uint amountInMax,
        address input,
        address output,
        address to
    ) external {
        address collateral = address(IOption(option).collateral());

        (uint reserveIn, uint reserveOut) = getReserves(input, output);
        uint numerator = reserveIn.mul(amountOut).mul(1000);
        uint denominator = reserveOut.sub(amountOut).mul(997);
        uint amountIn = (numerator / denominator).add(1);

        console.log("amountIn:", amountIn);
        require(amountIn <= amountInMax, 'EXCESSIVE_INPUT_AMOUNT');

        address pair = IUniswapV2Factory(_uniswap).getPair(input, output);
        IERC20(collateral).transferFrom(msg.sender, pair, amountIn);

        (address token0,) = input < output ? (input, output) : (output, input);
        (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));

        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, to, new bytes(0));
    }

}
