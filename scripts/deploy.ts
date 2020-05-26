import { ethers } from "@nomiclabs/buidler";
import { 
	MockCollateral, MockRelay, MockTxValidator, 
	MockRegistryAndResolver, OptionPool
} from "./contracts";

async function main() {
	let signers = await ethers.signers();

	// this will be a stablecoin
	const collateral = await MockCollateral(signers[0]);

	const relay = await MockRelay(signers[0]);
	const validator = await MockTxValidator(signers[0]);
	const registry = await MockRegistryAndResolver(signers[0]);

	// finally deploy options over assets
	return OptionPool(signers[0], collateral.address, relay.address, validator.address);
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
