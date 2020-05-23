import { Signer } from "ethers";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionPoolFactory } from "../typechain/OptionPoolFactory";
import contracts from "../contracts";
import { MockRelayFactory } from "../typechain/MockRelayFactory";
import { MockTxValidatorFactory } from "../typechain/MockTxValidatorFactory";
import { ERC137ResolverFactory } from "../typechain/ERC137ResolverFactory";
import { ERC137RegistryFactory } from "../typechain/ERC137RegistryFactory";
import { PutOptionFactory } from "../typechain/PutOptionFactory";

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

export function attachOption(signer: Signer, address: string) {
	return new PutOptionFactory(signer).attach(address);
}

// use Dai addresses
export async function Collateral() {
    // if we use the ganache forking option, use the Dai address on Ropsten
    // otherwise, we use a blank ERC20
	const dai = contracts.dai;
	console.log("Collateral (Dai)", dai);
	return dai;
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