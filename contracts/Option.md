# Option

Represents options that may be exercised for the
backing currency in exchange for the underlying BTC.

> 




## Functions



**initialize** ( **uint256** _expiryTime, **uint256** _windowSize, **address** _referee, **address** _treasury, **address** _obligation ) 

Initializes the option-side contract with the
expected parameters.


> 

___



**mint** ( **address** from, **address** to, **uint256** amount, **bytes20** btcHash, **enum Bitcoin.Script** format ) 

Mints option tokens `from` a writer and transfers them `to` a
participant - designed to immediately add liquidity to a pool. This contract
will then call the owned Obligation contract to mint the `from` tokens. To 
prevent misappropriation of funds we expect this function to be called atomically
after depositing in the treasury. The `OptionLib` contract should provide helpers 
to facilitate this.


> Can only be called by the parent factory contract.
Once the expiry date has lapsed this function is no longer valid.


___




**requestExercise** ( **address** seller, **uint256** amount ) 



> 

___



**executeExercise** ( **address** seller, **uint256** height, **uint256** index, **bytes32** txid, **bytes** proof, **bytes** rawtx ) 

Exercises an option after `expiryTime` but before `expiryTime + windowSize`. 
Requires a transaction inclusion proof which is verified by our chain relay.


> Can only be called by the parent factory contract.


___



**refund** ( **uint256** amount ) 

Refund written collateral after `expiryTime + windowSize`.


> Can only be called by the parent factory contract.


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



**transfer** ( **address** recipient, **uint256** amount )  → bool



> See {IERC20-transfer}

___



**transferFrom** ( **address** sender, **address** recipient, **uint256** amount )  → bool



> See {IERC20-transferFrom}

___





