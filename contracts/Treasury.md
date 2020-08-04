# Treasury

This contract manages locking and unlocking of collateral.


> This should not be ownable since it may be shared across factories.
All operations MUST be called atomically to prevent misappropriation.




## Functions



**constructor** ( **address** _collateral ) 

Initialize the treasury contract against an ERC20 token.


> 

___



**balanceOf** ( **address** market, **address** account )  → uint256

Returns the balance of an `account` under a particular `market`.


> 

___



**deposit** ( **address** market, **address** account ) 

Deposit collateral in the specified `market`. Assumes
collateral has been transferred within the same transaction and claims
the unreserved balance since the last deposit.


> Once 'unlocked' the caller must atomically write options or buy obligations
to prevent misapproriation.


___



**lock** ( **address** account, **uint256** amount ) 

Lock collateral for the caller, assuming sufficient
funds have been deposited against the market.


> Reverts if if there is insufficient funds 'unlocked'.


___



**release** ( **address** from, **address** to, **uint256** amount ) 

Release collateral for a specific account owned by
the caller. For instance, if an account has exercised or 
refunded their options against a specific market (obligation),
after performing the necessary correctness checks that contract
should call this function.


> 

___




