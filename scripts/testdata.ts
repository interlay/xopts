import { ethers } from "@nomiclabs/buidler";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { 
	MockCollateral, MockRelay, MockTxValidator, 
	MockRegistryAndResolver, OptionPool, call, attachOption
} from "./contracts";

let btcAddress = "0x66c7060feb882664ae62ffad0051fe843e318e85";

async function main() {
	let signers = await ethers.signers();

	let alice = signers[0];
	let bob = signers[1];
	let charlie = signers[2];
	let eve = signers[3];
	let dave = signers[4];

	let aliceAddress = await alice.getAddress();
	let bobAddress = await bob.getAddress();
	let charlieAddress = await charlie.getAddress();
	let eveAddress = await eve.getAddress();
	let daveAddress = await dave.getAddress();

	const collateral = await MockCollateral(alice);
	const relay = await MockRelay(alice);
	const validator = await MockTxValidator(alice);
	const registry = await MockRegistryAndResolver(alice);

	let pool = await OptionPool(alice, collateral.address, relay.address, validator.address, registry.address);

	await pool.createOption(1000, 1, 1);
	await pool.createOption(500, 2, 3);
	await pool.createOption(2000, 5, 2);

	let options = await pool.getOptions();
	
	await call(collateral, CollateralFactory, alice).mint(aliceAddress, 1_000_000);
	await call(collateral, CollateralFactory, alice).mint(bobAddress, 1_000_000);
	await call(collateral, CollateralFactory, alice).mint(charlieAddress, 1_000_000);
	await call(collateral, CollateralFactory, alice).mint(eveAddress, 1_000_000);
	await call(collateral, CollateralFactory, alice).mint(daveAddress, 1_000_000);

	let optionAddress = options[0];
	await call(collateral, CollateralFactory, bob).approve(optionAddress, 200);
	await attachOption(bob, optionAddress).underwrite(100, btcAddress);
	await call(collateral, CollateralFactory, charlie).approve(optionAddress, 300);
	await attachOption(charlie, optionAddress).underwrite(300, btcAddress);

	await call(collateral, CollateralFactory, alice).approve(optionAddress, 100);
	await attachOption(alice, optionAddress).insure(100, bobAddress);

	optionAddress = options[2];
	await call(collateral, CollateralFactory, eve).approve(optionAddress, 700);
	await attachOption(eve, optionAddress).underwrite(700, btcAddress);

	await call(collateral, CollateralFactory, dave).approve(optionAddress, 250*5);
	await attachOption(dave, optionAddress).insure(250, eveAddress);

}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
