XFLASH at a Glance
==================

Flash loans are a new type of loans that are made possible by the design of the Ethereum Virtual Machine (EVM). Imagine you can take out a loan, executes actions with the loan, and automatically enforce the repayment only if you can afford it. That is exactly what a flash loan allows you: if you have made successful arbitrage trade, or replaced your Maker CDP position with a different collateral asset you will be able to repay the loan. If you have made a loss executing your actions, the flash loan behaves as it would have never tkane place. This makes it a risk-free loan for both the borrower and the lender.

XFLASH extends the native capabilities of Ethereum to execute flash loans. Specifically, we enable lenders to lock assets on another chain, Bitcoin, and borrowers to take a loan against the locked Bitcoin on Ethereum. This way we:

* Enable cross-chain flash loans purely by locking asset on the backing-chain (Bitcoin)
* Remove the necessity to provide collateral for the backing of Bitcoin-backed tokens
* Build an entirely trustless system by utilizing SPV proofs