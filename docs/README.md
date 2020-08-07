# Welcome to the XOpts Documentation!

## XOpts in a Nutshell

XOpts is a protocol for cross-chain BTC put options. BTC put options give the right, but not an obligation, to the buyer to sell BTC at a predefined price (the strike price) to the writer of the option within an agreed time (the expiry) in return for a fee (the premium).
XOpts implements its BTC put options through a structure that is very similar to Uniswap. Thereby, XOpts generates option tokens that give the right to exercise the option (i.e. selling BTC) as well as obligation tokens that represent the commitment to buy BTC. In comparison to other option platforms, both the option and the obligation are tradeable.
The price of the option (the premium) and the obligation is determined by an Automated Market Maker (AMM) function. The system is entirely open as anyone can create new BTC put options with various strike prices and expiry dates. Moreover, the option writers act as Liquidity Providers (LPs) that earn a premium from selling options and provide liquidity to the option pools. Option buyers do not directly interact with option writers but rather buy options form the option pool.
Execution of the option is done natively on BTC and proven to Ethereum by a so-called chain relay (BTC Relay). This allows XOpts to be **entirely non-custodial** such that buyers keep their BTC until they want to execute the option. Moreover, XOpts **does not require an oracle** as the execution of the option happens natively on Bitcoin with trustless proofs on Ethereum.


## Use Cases

**Buying and Selling Bitcoin**

XOpts allows anyone to buy and sell Bitcoin with trusting any third-party or oracle. We imagine that *selling Bitcoin* is desireable if a user wants to sell part of their existing Bitcoin holdings to receive USDT on Ethereum. With this USDT, the user can then participate in any DeFi platform on Ethereum. Hence, we see XOpts as the gateway to Ethereum's DeFi space without requiring to exchange Bitcoin at an centralized exchange or wrapping your Bitcoin and requiring to give up custody. Moreover, since XOpts leverages an AMM structure, it is always possible to sell Bitcoin against the market without waiting for a counter-party as in traditional atomic cross-chain swaps.

The other side of this is the possibility to *buy Bitcoin* at a predictable price and earning an interest on the provided collateral. Instead of waiting for a limit order to be filled at an exchange, your collateral earns an interest based on the trades that are being made. At the same time, liquidity providers are able to receive Bitcoin in a trustless manner: when a seller of Bitcoin executes their option, physical Bitcoin are sent to the writer of the option. Thereby, XOpts is currently the only platform that allows users to buy Bitcoin without trust a centralized exchange, an oracle, or a wrapped token construction while earning interest on their collateral.

**Trading Options**

The underlying structure for buying and selling Bitcoin are options that are written and bought by the parties that are interested in physical settlement. We acknowledge that traders might wish to simply trade different options and being cash settled. This is enabled by our trading functionality: a BTC trading platform that requires only a margin of the full collateral and leverages the liquidity provided by the parties willing to buy and sell Bitcoin.
