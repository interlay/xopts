import { ethers } from "@nomiclabs/buidler";

async function main() {
	const factory = await ethers.getContract("Treasury");

	// If we had constructor arguments, they would be passed into deploy()
	let contract = await factory.deploy();
	// The address the Contract WILL have once mined
	console.log("Treasury contract:", contract.address);
	// The transaction that was sent to the network to deploy the Contract
	console.log("Treasury deploy tx:", contract.deployTransaction.hash);
	// The contract is NOT deployed yet; we must wait until it is mined
	await contract.deployed();
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});s
