# OptionLib

Helper contract to facilitate atomic option writing
and obligation purchases (as we require buyer collateralization).

> 




## Functions



**constructor** ( **address** uniswapFactory ) 



> 

___




**swapExactTokensForTokens** ( **uint256** amountIn, **uint256** amountOutMin, **address** input, **address** output ) 

Sell Order

> 

___



**swapTokensForExactTokens** ( **uint256** amountOut, **uint256** amountInMax, **address** input, **address** output ) 

Buy Order

> 

___




**addLiquidity** ( **address** tokenA, **address** tokenB, **uint256** amountADesired, **uint256** amountBDesired, **uint256** amountAMin, **uint256** amountBMin )  → uint256 amountA, uint256 amountB, uint256 liquidity

Add liquidity to a pool


> Requires pre-approval for input coins


___



**lockAndWrite** ( **address** option, **uint256** premium, **uint256** amount, **bytes20** btcHash, **enum Bitcoin.Script** format )  → uint256



> 

___



**lockAndBuy** ( **address** obligation, **uint256** amountOut, **uint256** amountInMax ) 



> 

___




