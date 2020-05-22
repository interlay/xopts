import { ethers } from "@nomiclabs/buidler";
import { Signer } from "ethers";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionPoolFactory } from "../typechain/OptionPoolFactory";

// TODO: use Dai / USDC addresses
async function Collateral(signer: Signer): Promise<string> {
    let factory = new CollateralFactory(signer);
    let contract = await factory.deploy();
	console.log("Collateral (Dai) contract:", contract.address);
	await contract.deployed();
	return contract.address;
}

async function OptionPool(signer: Signer, collateral: string) {
	let factory = new OptionPoolFactory(signer);
	let contract = await factory.deploy(collateral);
	// The address the Contract WILL have once mined
	console.log("OptionPool contract:", contract.address);
	// The contract is NOT deployed yet; we must wait until it is mined
	await contract.deployed();
}

async function main() {
	let signers = await ethers.signers();

	// this will be a stablecoin
	const collateral = await Collateral(signers[0]);

	// finally deploy options over assets
	await OptionPool(signers[0], collateral);
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
