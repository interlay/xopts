# XOPTS

<div align="center">
	<p align="center">
		<img src="dapp/src/assets/img/xopts.png" alt="logo" width="128" height="128">
	</p>
	<p>
		<h3 align="center">XOPTS: Trustless, Non-Custodial Bitcoin Options on Ethereum</h3>
		<h4 align="center">Live at: <a href="https://xopts.io" target="__blank">xopts.io</a></h5>
		<h5 align="center">Status: Testnet (Ropsten) </h5>
	</p>
</div>


## About

In traditional finance, an [option](https://en.wikipedia.org/wiki/Option_(finance)) enables the owner to buy or sell an underlying asset at a specified conversion rate before an expiration date.
XOPTS extends the native capabilities of Ethereum to track and execute PUT Options against BTC. Specifically, we enable sellers to lock DAI collateral in a contract to mint ERC-20 compatible option
tokens that can be traded on [Uniswap](https://uniswap.org/). Buyers can then insure an arbitrary amount of BTC relative to the contract's strike price and pay in an amount of DAI collateral as premium.
Finally, options can be exercised once the buyer proves payment to the respective underwriters of that contract using an on-chain Bitcoin SPV client.

### Protocol

- A seller (underwriter) creates a BTC put option with a strike price (the value of BTC the seller is willing to insure in Dai), an expiry time (the validity of the option), and a premium (the fee paid to the seller for buying an option in Dai).
- A seller underwrites an option contract previously created by locking a number of Dai into the option contract. This creates a number of option tokens with the specific expiry, premium and strike price that are now available for buyers to obtain. During this process the seller also attaches his BTC address to the option tokens. For example, if the strike price is 10,000 Dai for a BTC and the seller locks 1,000 Dai, he would have generated 1,000 option tokens.
- The buyer then goes ahead and buys a number of option tokens at a specific expiry, premium, and strike price.
- During the expiry time, the buyer can exercise the option. To achieve this, he must send a number of BTC to the seller. Then, he proves that he sent the required number of BTC to the option smart contract. In return, the option tokens are burned and the buyer obtains underlying Dai provided by the seller.
- After the expiry time, the seller can reclaim any unused collateral.
- At any time a buyer can exchange his option tokens on Uniswap in a (Dai/Options) trading pair.


### System Overview

You can find more details on how XOpts works in our [Guides](https://xopts.io/help) (buy, sell, exercise, refund options).

<img src="media/process/overview.png" alt="XOpts system overview" width="700">

### Built with

* [Node]()
* [Typescript]()
* [Buidler](https://buidler.dev/)
* [money-legos](https://github.com/studydefi/money-legos)

## Getting Started

Make sure you have [node](https://nodejs.org/en/) installed. Generally, we also recommend managing different version of node via version manager like [NVM](https://github.com/nvm-sh/nvm).

First, clone this repository, initialize its submodules and enter into its root folder.

```bash
git clone git@gitlab.com:interlay/xopts.git
git submodule init && git submodule update
cd xopts
```

### Smart Contracts

Install the required node packages.

```bash
npm install
```

Compile the XOPTS contracts.

```bash
npm run compile
```

Deploy the XOPTS contracts.

```bash
npm run deploy
```

### Development

Compile contracts and create the [TypeChain](https://github.com/ethereum-ts/TypeChain) interfaces.

```bash
npm run build
```

Run tests.

```bash
npm test
```

#### Bitcoin Testnet

In order to verify testnet transactions we need to swap out any mocked components.

1. Launch a local instance of Ganache.
2. Clone the [btc-relay-sol](https://gitlab.com/interlay/btc-relay-sol) repository.
3. Deploy using the testnet configuration.
4. On `OptionPool` deployment use the live relay address and `./lib/TxValidator.sol`.

### Testdata

Make sure ganache or buidlerevm is running in one terminal window.

**ganache**

```bash
npm run ganache
```

**buidlerevm**

```bash
npx buidler node
```

In another terminal, create test data that can be used in the front-end. Execute this from the root folder of the project.

```bash
npx buidler run scripts/testdata.ts --network localhost
```

### [React UI](https://gitlab.com/interlay/xopts-ui)

```bash
git clone git@gitlab.com:interlay/xopts-ui.git
yarn install
yarn start
```

You can interact with a locally deployed front-end on [localhost:3000](http://localhost:3000).

## Deployments

### Ethereum Ropsten Testnet

+ Collateral (ERC20): [0x4DfB2bE72b3F2ac346Be86B78491E56f21522fB2](https://ropsten.etherscan.io/address/0x4DfB2bE72b3F2ac346Be86B78491E56f21522fB2)
+ OptionPool: [0x11Bb2d104E82a4DE8e40E9562d17999Ec2E46B8c](https://ropsten.etherscan.io/address/0x11Bb2d104E82a4DE8e40E9562d17999Ec2E46B8c)
+ Interlay's BTC-Relay: [0x78A389B693e0E3DE1849F34e70bf4Bcb57F0F2bb](https://ropsten.etherscan.io/address/0x78A389B693e0E3DE1849F34e70bf4Bcb57F0F2bb)


You can interact with Xopts on [xopts.io ](https://xopts.io)or run a locally deployed front-end on [localhost:3000](http://localhost:3000).

## Roadmap

- [x] Integration with [Uniswap v2](https://uniswap.org/docs/v2).
- [ ] Integration with [ENS](https://ens.domains/).
- [x] Deployment on Ropsten.
- [ ] Development of call options.


## Contributing

If you would like to contribute, please file an issue on Github or reach out to us.

- [Telegram](t.me/interlay)
- [Riot](https://matrix.to/#/!nZablWWaicZyVTWyZk:matrix.org?via=matrix.org)

We are [hiring](https://www.interlay.io/careers/)!


## License

(C) Copyright 2020 [Interlay](https://www.interlay.io) Ltd

XOPTS is licensed under the terms of the Apache License (Version 2.0). See [LICENSE](LICENSE).

## Contact


Website: [Interlay.io](https://www.interlay.io)

Twitter: [@interlayHQ](https://twitter.com/InterlayHQ)

Email: contact@interlay.io


## Acknowledgements

