import { ethers } from "@nomiclabs/buidler";

// TODO: use Dai / USDC addresses
async function Mintable(): Promise<string> {
	const factory = await ethers.getContract("Mintable");
	let contract = await factory.deploy();
	console.log("Collateral (Mintable):", contract.address);
	await contract.deployed();
	return contract.address;
}

async function ERC20Expiring(): Promise<string> {
	const factory = await ethers.getContract("ERC20Expiring");
	let contract = await factory.deploy();
	console.log("ERC20Expiring:", contract.address);
	await contract.deployed();
	return contract.address;
}

async function OptionPool(collateral: string, underlying: string) {
	const factory = await ethers.getContract("OptionPool");
	let contract = await factory.deploy(collateral, underlying);
	// The address the Contract WILL have once mined
	console.log("OptionPool contract:", contract.address);
	// The contract is NOT deployed yet; we must wait until it is mined
	await contract.deployed();
}

async function main() {
	// this will be a stablecoin
	const collateral = await Mintable();
	// this is xBTC / xFlash
	const underlying = await ERC20Expiring();
	// finally deploy options over assets
	await OptionPool(collateral, underlying);
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
