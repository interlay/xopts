import { ethers } from "@nomiclabs/buidler";
import { Signer } from "ethers";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionPoolFactory } from "../typechain/OptionPoolFactory";
import config from "../buidler.config";
import contracts from "../contracts";

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

async function OptionPool(signer: Signer, collateral: string) {
    let factory = new OptionPoolFactory(signer);
	let contract = await factory.deploy(collateral);
	console.log("OptionPool contract:", contract.address);
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
