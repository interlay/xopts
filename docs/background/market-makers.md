# Automated Market Makers

An Automated Market Maker is a smart contract that holds certain assets and acts as a “trading partner”. As long as there is some liquidity in the contract, buying and selling of the assets is possible according to a specific function that determines the exchange rate. [This post by Berenzon gives a very good overview of different AMMs](https://medium.com/bollinger-investment-group/constant-function-market-makers-defis-zero-to-one-innovation-968f77022159). Note that in AMMs the buyers and sellers never need to interact with each other.

## Option-side AMM

In the figure below, we show how two option buyers interact with the option-side pool to buy and sell option tokens using the stablecoin of choice, USDT in the example. Both buyers can freely buy and sell option tokens with the option-side pool as long as there is liquidity available.

![AMM-option](./AMM-option.png ':size=100%')

## Obligation-side AMM

In principle, the trading of obligations follows the same principle as the trading of options. However, we make one difference: In the figure below, we show that the option writer buying an obligation needs to have sufficient collateral in the Treasury smart contract to be eligible for buying the option and needs to have their BTC address stored in the obligation ERC20. We enforce this by checking this condition in the transfer function of the obligation ERC20. We can add a lockAndBuy function in the obligation erc20 that locks the required collateral and then buys the obligations tokens from the obligation pool.

![AMM-obligation](./AMM-obligation.png ':size=100%')
