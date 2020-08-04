# OptionPairFactory

Tracks and manages ERC20 Option pairs.

> 




## Functions



**setBtcAddress** ( **bytes20** btcHash, **enum Bitcoin.Script** format ) 

Sets the preferred payout address for the caller.
The script format is defined by the `Bitcoin.Script` enum which describes
the expected output format (P2SH, P2PKH, P2WPKH).


> 

___



**getBtcAddress** (  )  → bytes20 btcHash, enum Bitcoin.Script format

Get the preferred BTC address for the caller.


> 

___





**createPair** ( **uint256** expiryTime, **uint256** windowSize, **uint256** strikePrice, **address** collateral, **address** referee )  → address option, address obligation

Creates a new option pair with the given parameters. If no
treasury contract exists for the associated collateral address a new one
is made and registered. The ownership of the obligation-side contract is
immediately transferred to the option-side contract.


> 

___



**allOptions** (  )  → address[]



> 

___





## Events


**Create** ( **address** option, **address** obligation, **uint256** expiryTime, **uint256** windowSize, **uint256** strikePrice )

Emitted whenever this factory creates a new option pair.

> 

___


