# Options and Obligations

In XOpts, an option is a token that represents the right to sell BTC at a given strike price. An obligation is the other side of the deal: the obligation token represents the necessity to buy BTC for the given strike price. We are using these two types of tokens to bootstrap two AMM-based exchange markets:

- The option-side pool: Option-side tokens are traded by option buyers. Buying option tokens gives the option buyers the right to exercise the option against an option writer of their choosing. However, the buyer only has to select a writer in the exercise protocol. Before exercising, option tokens can be freely bought and sold to the option-side pool represented by a Uniwap Pair.
- The obligation-side pool: Obligation-side tokens are traded by option writers. Buying an obligation gives writers access to the premium that is obtained by selling options as well as the premium from selling obligations itself. However, option writers need to provide sufficient collateral to be able to buy obligations. Moreover, if an option writer is selected to be exercised by an option buyer, the writer will receive BTC and in return his collateral will be transferred to the option buyer.

The option-side pool is created when the first writer writes an option. The obligation-side pool is created when the first option writer sells obligations.
