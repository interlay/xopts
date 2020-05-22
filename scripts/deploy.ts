import { ethers } from "@nomiclabs/buidler";
import { Signer } from "ethers";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionPoolFactory } from "../typechain/OptionPoolFactory";
import config from "../buidler.config";
import contracts from "../contracts";
import { MockRelayFactory } from "../typechain/MockRelayFactory";
import { MockValidFactory } from "../typechain/MockValidFactory";
import { ERC137ResolverFactory } from "../typechain/ERC137ResolverFactory";
import { ERC137RegistryFactory } from "../typechain/ERC137RegistryFactory";


// use Dai addresses
async function Collateral(signer: Signer): Promise<string> {
    // if we use the ganache forking option, use the Dai address on Ropsten
    // otherwise, we use a blank ERC20
    if ('fork' in config.networks.ganache) {
        const dai = contracts.dai;
        console.log("Collateral (Dai)", dai);
        return dai;
    } else {
        let factory = new CollateralFactory(signer);
	    let contract = await factory.deploy();
	    console.log("Collateral (ERC20):", contract.address);
	    await contract.deployed();
	    return contract.address;
    }
}

async function MockRelay(signer: Signer) {
    let factory = new MockRelayFactory(signer);
	let contract = await factory.deploy();
	console.log("MockRelay contract:", contract.address);
	await contract.deployed();
	return contract.address;
}

async function MockValid(signer: Signer) {
    let factory = new MockValidFactory(signer);
	let contract = await factory.deploy();
	console.log("MockValid contract:", contract.address);
	await contract.deployed();
	return contract.address;
}

async function MockRegistryAndResolver(signer: Signer) {
    let resolverFactory = new ERC137ResolverFactory(signer);
    let resolver = await resolverFactory.deploy(await signer.getAddress());

    let registryFactory = new ERC137RegistryFactory(signer);
    let registry = await registryFactory.deploy();
    registry.setResolver(Buffer.alloc(32).fill(0), resolver.address);

	await registry.deployed();
	return registry.address;
}

async function OptionPool(signer: Signer, collateral: string, relay: string, valid: string, ens: string) {
    let factory = new OptionPoolFactory(signer);
	let contract = await factory.deploy(collateral, relay, valid, ens);
	console.log("OptionPool contract:", contract.address);
	await contract.deployed();
}

async function main() {
	let signers = await ethers.signers();

	// this will be a stablecoin
	const collateral = await Collateral(signers[0]);

	const relay = await MockRelay(signers[0]);
	const validator = await MockValid(signers[0]);
	const registry = await MockRegistryAndResolver(signers[0]);

	// finally deploy options over assets
	await OptionPool(signers[0], collateral, relay, validator, registry);
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
