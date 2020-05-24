# XOPTS

<div align="center">
	<p align="center">
		<img src="media/icon_256.png" alt="logo" width="128" height="128">
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

### Built with

* [Node]()
* [Typescript]()
* [Buidler](https://buidler.dev/)
* [money-legos](https://github.com/studydefi/money-legos)

## Getting Started

Make sure you have [node](https://nodejs.org/en/) installed. Generally, we also recommend managing different version of node via version manager like [NVM](https://github.com/nvm-sh/nvm).

First, clone this repository and enter into its root folder.

```bash
git clone git@gitlab.com:interlay/xflash.git
cd xflash
```

Next, install the required node packages.

```bash
npm install
```

Compile the XFLASH contracts.

```bash
npm run compile
```

Deploy the XFLASH contracts.

```bash
npm run deploy
```

### Ganache

Start ganache and then run deploy against localhost:

```bash
npm run ganache
npm run deploy -- --network localhost
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

### React UI

```bash
cd ./dapp
yarn install
yarn start
```

## Usage

## Roadmap

## Contributing

## License

XFLASH is licensed under the terms of the Apache License (Version 2.0). See [LICENSE](LICENSE).

## Contact

## Acknowledgements

