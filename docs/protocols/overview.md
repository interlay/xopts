# Protocol Overview

## Roles

- **Writer (Alice)**: Alice writes put options to receive a premium. The writing process generates option tokens that are transferred into a pool to be available for buying. The option writer has an obligation (represented by obligation tokens) to receive BTC if the buyer executes the option in return for a stablecoin (e.g. USDT).
- **Buyer (Bob)**: Bob buys put options (the option tokens) to bet on a BTC price decrease. He has the option to exercise the option tokens by sending BTC to the writer and receiving stablecoins in return.
- **Creator (Charlie)**: Charlie creates a new option with a specific strike criterion (e.g. a strike price), expiry time, a referee (e.g. BTC-Relay or an oracle), and a collateral (eg. USDT, Dai, a Balancer pool token, …).
- **Trader (Tom)**: Tom is not interested in physical settlement of the option but rather trades options to gain a profit.

## High-Level Protocols

There are three high-level protocols that are a composed by the XOpts sub-protocols.

1. **Writing options for physical settlement**: Option writers “write” options (mint option-side tokens and mint obligation-side tokens) on Ethereum by collateralizing the option value through a stablecoin (or a pool of stablecoins). Only the option-side tokens are added to an option pool (the option-side pool). The option writer than earns from trades that are happening against the pool and possibly receives BTC from an option buyer.
2. **Buying options for physical settlement**: Option buyers buy the options (option tokens) from the option-side pool on Ethereum with a stablecoin. The fees (i.e., the premium) buyers pay is added to the option-side pool. Option buyers need to physically settle the option to sell their BTC for the collateral token (e.g. USDT).
3. **Trading Options**

    a) **Buying options**: The trader buys the option from the option-side pool.

    b) **Selling options**: The trader writes options using a two-step process that we automate in the background. First, the trader buys options that have the same amount of backing collateral that the trader wants to sell. Second, the trader writes the option that he wishes to have exposure for.


## Sub Protocols

The sub-protocols of XOpts are as follows:

1. **Create Option Contracts**: Anyone can create a new option contract by specifying

    a) a strike criterion (e.g. strike price, bitcoin difficulty),

    b) an expiry time,

    c) a referee (e.g. BTC-Relay or another oracle),

    d) and a collateral (e.g. a stablecoin like USDT or Dai).

2. **Writing Options**: Option writers “write” options (mint option-side tokens and mint obligation-side tokens) on Ethereum by collateralizing the option value through a stablecoin (or a pool of stablecoins). Only the option-side tokens are added to an option pool (the option-side pool).

3. **Buying Options**: Option buyers buy the options (option tokens) from the option-side pool on Ethereum with a stablecoin. The fees (i.e., the premium) buyers pay is added to the option-side pool. Option writers are able to withdraw the fees once the option has expired.

4. **Selling Options**: Option buyers can sell their option tokens against the option-side pool and receive stablecoin tokens in return.

5. **Exercise Options**: Exercising an option is requested on Ethereum locking the obligation tokens of the option writers so that they cannot be sold. Then, exercising an option is executed directly on Bitcoin: (i) the option buyer sends BTC to one or more sellers on Bitcoin and (ii) submits a proof that the BTC transfer was correctly executed (i.e, correct amount and recipients) to the BTC-Relay contract on Ethereum, (iii) and receives the strike price amount in Stablecoins from the Treasury contract on Ethereum. This protocol is essentially a cross-chain atomic SPV swap.

6. **Buying Obligations**: An option writer can buy obligations from the obligation-side pool if the writer has provided enough collateral and specified a valid BTC address to receive BTC payments.

7. **Selling Obligations**: An option writer can sell obligations to an obligation-side pool. If the obligation-side pool does not yet exist, the first option writer wishing to sell obligations creates the pool.
