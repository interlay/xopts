import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet, Contract } from "ethers";
import { legos } from "@studydefi/money-legos";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionPoolFactory } from "../typechain/OptionPoolFactory";
import contracts from "../contracts";
import { MockRelayFactory } from "../typechain/MockRelayFactory";
import { MockTxValidatorFactory } from "../typechain/MockTxValidatorFactory";
import { ERC137ResolverFactory } from "../typechain/ERC137ResolverFactory";
import { ERC137RegistryFactory } from "../typechain/ERC137RegistryFactory";
import { PutOptionFactory } from "../typechain/PutOptionFactory";
import IUniswapV2Factory from '@uniswap/v2-core/build/IUniswapV2Factory.json'
import IUniswapV2ERC20 from '@uniswap/v2-core/build/IUniswapV2ERC20.json'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'

interface Callable {
	address: string;
}

interface Attachable<C> {
	attach(addr: string): C;
}

export function call<A extends Callable, B extends Attachable<A>>(contract: A, factory: new (from: Signer) => B, signer: Signer): A {
	let _factory = new factory(signer);
	return _factory.attach(contract.address);
}

export async function mintDai(collateral: Contract, userAddress: string, collateralAmount: string) {
    let signer = ethers.provider.getSigner(contracts.dai_account);
    let fromDaiAccount = collateral.connect(signer);

    await fromDaiAccount.transfer(userAddress, collateralAmount);
}

export function attachOption(signer: Signer, address: string) {
	return new PutOptionFactory(signer).attach(address);
}

// convert a BTC amount to satoshis
export function btcToSatoshi(amount: number) {
    return amount * 100_000_000;
}

// convert a BTC amount to satoshis
export function mbtcToSatoshi(amount: number) {
    return amount * 100_000;
}

// convert satoshis to mBTC
export function satoshiToMbtc(amount: number) {
    return Math.round(amount / 100_000);
}

// convert dai to weiDai
export function daiToWeiDai(amount: number) {
    return ethers.utils.parseEther(amount.toString());
}

// convert dai to weiDai
export function mdaiToWeiDai(amount: number) {
    let dai = amount / 1000;
    return daiToWeiDai(dai);
}

// convert weiDai to mDai
export function weiDaiToMdai(amount: string) {
    return ethers.utils.formatUnits(amount, 15);
}

// calculate the premium in dai for 1 BTC
export function premiumInDaiForOneBTC(amount: number) {
    let weiDai = daiToWeiDai(amount);
    return weiDai.div(btcToSatoshi(1));
}

// calculate the premium in dai for 1 BTC
export function strikePriceInDaiForOneBTC(amount: number) {
    let weiDai = daiToWeiDai(amount);
    return weiDai.div(btcToSatoshi(1));
}

// use Dai addresses
export async function Collateral() {
    // if we use the ganache forking option, use the Dai address on Ropsten
	const dai = contracts.dai;
    const collateral = await ethers.getContractAt(legos.erc20.abi, dai);
	console.log("Collateral (Dai)", dai);
	return collateral;
}

// Uniswap factory
export async function createUniswapPair(signer: Signer, tokenA: string, tokenB: string, pairAddress: string) {
    const abi = IUniswapV2Factory.abi;
    const factory = await ethers.getContractAt(abi, "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", signer);
    await factory.createPair(tokenA, tokenB);
    const pairAbi = IUniswapV2Pair.abi;
    return await ethers.getContractAt(pairAbi, pairAddress);
}


export async function MockCollateral(signer: Signer) {
	let factory = new CollateralFactory(signer);
	let contract = await factory.deploy();
	console.log("Collateral (ERC20):", contract.address);
	return contract.deployed();
}

export async function MockRelay(signer: Signer) {
    let factory = new MockRelayFactory(signer);
	let contract = await factory.deploy();
	console.log("MockRelay contract:", contract.address);
	return contract.deployed();
}

export async function MockTxValidator(signer: Signer) {
    let factory = new MockTxValidatorFactory(signer);
	let contract = await factory.deploy();
	console.log("MockTxValidator contract:", contract.address);
	return contract.deployed();
}

export async function MockRegistryAndResolver(signer: Signer) {
    let resolverFactory = new ERC137ResolverFactory(signer);
    let resolver = await resolverFactory.deploy(await signer.getAddress());

    let registryFactory = new ERC137RegistryFactory(signer);
    let registry = await registryFactory.deploy();
    registry.setResolver(Buffer.alloc(32).fill(0), resolver.address);
	return registry.deployed();
}

export async function OptionPool(signer: Signer, collateral: string, relay: string, valid: string, ens: string) {
    let factory = new OptionPoolFactory(signer);
	let contract = await factory.deploy(collateral, relay, valid, ens);
	console.log("OptionPool contract:", contract.address);
	return contract.deployed();
}
