# XOPTS

<div align="center">
	<p align="center">
		<img src="media/xopt.svg.png" alt="logo" width="128" height="128">
	</p>
	<p>
		<h3 align="center">XOPTS: Bitcoin Backed Options on Ethereum</h3>
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

### React UI

```bash
cd ./dapp
yarn install
yarn start
```

You can interact with a locally deployed front-end on [localhost:3000](http://localhost:3000).

## Deployments

### Ropsten

```
Collateral (ERC20): 0x117054F477B40128A290a0d48Eb8aF6e12F333ce
TxValidator: 0xD82ad83De34dea5E5B0D6c3716557D1c9EC0A699
OptionPool: 0x2900a6b10d83C4Be83CBd80784a34D8ba4A1D99D
```

You can interact with a locally deployed front-end on [localhost:3000](http://localhost:3000).

## Roadmap

- [x] Integration with [Uniswap v2](https://uniswap.org/docs/v2).
- [ ] Integration with [ENS](https://ens.domains/).
- [ ] Deployment on Ropsten.
- [ ] Development of call options.

## Contributing

## License

XOPTS is licensed under the terms of the Apache License (Version 2.0). See [LICENSE](LICENSE).

## Contact

## Acknowledgements

