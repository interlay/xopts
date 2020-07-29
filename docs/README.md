# Welcome to the XOpts Documentation!

## XOpts in a Nutshell

XOpts is a protocol for cross-chain BTC put options. BTC put options give the right, but not an obligation, to the buyer to sell BTC at a predefined price (the strike price) to the writer of the option within an agreed time (the expiry) in return for a fee (the premium).
XOpts implements its BTC put options through a structure that is very similar to Uniswap. Thereby, XOpts generates option tokens that give the right to exercise the option (i.e. selling BTC) as well as obligation tokens that represent the commitment to buy BTC. In comparison to other option platforms, both the option and the obligation are tradeable.
The price of the option (the premium) and the obligation is determined by an Automated Market Maker (AMM) function. The system is entirely open as anyone can create new BTC put options with various strike prices and expiry dates. Moreover, the option writers act as Liquidity Providers (LPs) that earn a premium from selling options and provide liquidity to the option pools. Option buyers do not directly interact with option writers but rather buy options form the option pool.
Execution of the option is done natively on BTC and proven to Ethereum by a so-called chain relay (BTC Relay). This allows XOpts to be **entirely non-custodial** such that buyers keep their BTC until they want to execute the option. Moreover, XOpts **does not require an oracle** as the execution of the option happens natively on Bitcoin with trustless proofs on Ethereum.
