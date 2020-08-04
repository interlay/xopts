# Obligation

Represents a writer's obligation to sell the 
supported collateral backing currency in return for
the underlying currency - in this case BTC.


> 




## Functions



**initialize** ( **uint256** _expiryTime, **uint256** _windowSize, **uint256** _strikePrice, **address** _treasury ) 

Create Obligation ERC20


> 

___




**setBtcAddress** ( **bytes20** btcHash, **enum Bitcoin.Script** format ) 

Set the payout address for an account


> 

___



**getBtcAddress** ( **address** account )  → bytes20 btcHash, enum Bitcoin.Script format

Get the configured BTC address for an account


> 

___



**mint** ( **address** account, **uint256** amount, **bytes20** btcHash, **enum Bitcoin.Script** format ) 

Mints obligation tokens


> Can only be called by option contract before expiry


___




**requestExercise** ( **address** buyer, **address** seller, **uint256** amount ) 



> 

___



**getSecret** ( **address** seller )  → uint256



> 

___



**executeExercise** ( **address** buyer, **address** seller, **uint256** satoshiOutput ) 

Exercises an option after `expiryTime` but before `expiryTime + windowSize`. 


> Only callable by the parent option contract.


___



**refund** ( **address** seller, **uint256** amount ) 

Refund written collateral after `expiryTime + windowSize`.


> Only callable by the parent option contract.


___



**withdraw** ( **uint256** amount, **address** pool ) 

Withdraw collateral for obligation tokens if sold.


> 

___



**allowance** ( **address** owner, **address** spender )  → uint256



> See {IERC20-allowance}

___



**approve** ( **address** spender, **uint256** amount )  → bool



> See {IERC20-approve}

___




**balanceOf** ( **address** account )  → uint256



> See {IERC20-balanceOf}

___



**balanceObl** ( **address** account )  → uint256



> 

___



**transfer** ( **address** recipient, **uint256** amount )  → bool



> See {IERC20-transfer}

___



**transferFrom** ( **address** sender, **address** recipient, **uint256** amount )  → bool



> See {IERC20-transferFrom}

___







## Events


**RequestExercise** ( **address** buyer, **address** seller, **uint256** amount, **uint256** secret )



> 

___


