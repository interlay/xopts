# XFLASH

<div align="center">
	<p align="center">
		<img src="media/icon_256.png" alt="logo" width="128" height="128">
	</p>
	<p> 
		<h3 align="center">XFLASH: Bitcoin-powered flash loans on Ethereum</h3>
	</p>
</div>

## About

Flash loans are a new type of loans that are made possible by the design of the Ethereum Virtual Machine (EVM). Imagine you can take out a loan, executes actions with the loan, and automatically enforce the repayment only if you can afford it. That is exactly what a flash loan allows you: if you have made successful [arbitrage trade](https://medium.com/@bneiluj/flash-boys-arbitrage-dao-c0b96d094f93), or [replaced your Maker CDP position with a different collateral asset](https://collateralswap.com/) you will be able to repay the loan. If you have made a loss executing your actions, the flash loan behaves *as it would have never tkane place*. This makes it a risk-free loan for both the borrower and the lender.

XFLASH extends the native capabilities of Ethereum to execute flash loans. Specifically, we enable lenders to lock assets on another chain, Bitcoin, and borrowers to take a loan against the locked Bitcoin on Ethereum. This way we:

* Enable cross-chain flash loans purely by locking asset on the backing-chain (Bitcoin)
* Remove the necessity to provide collateral for the backing of Bitcoin-backed tokens
* Build an entirely trustless system by utilizing SPV proofs

### Built with

* [Node]()
* [Typescript]()
* [Buidler]()
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

### Development environment

Compile contracts and create the [TypeChain](https://github.com/ethereum-ts/TypeChain) interfaces.

```bash
npm run build
```

Run tests.

```bash
npm test
```


## Usage



## Roadmap

## Contributing

## License

XFLASH is licensed under the terms of the Apache License (Version 2.0). See [LICENSE](LICENSE).

## Contact

## Acknowledgements

