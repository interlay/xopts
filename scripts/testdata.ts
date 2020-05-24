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

    // get collateral for everyone
	await call(collateral, CollateralFactory, alice).mint(aliceAddress, 1_000_000);
	await call(collateral, CollateralFactory, alice).mint(bobAddress, 1_000_000);
	await call(collateral, CollateralFactory, alice).mint(charlieAddress, 1_000_000);
	await call(collateral, CollateralFactory, alice).mint(eveAddress, 1_000_000);
	await call(collateral, CollateralFactory, alice).mint(daveAddress, 1_000_000);

    console.log("Generating expired option");
    // get the current time
    let current_time = Math.round(new Date().getTime()/1000);
    // generate and underwrite option that expires in 30 secs
    let expiry = current_time + 30;
    await pool.createOption(expiry, 9, 9200);
	let options = await pool.getOptions();
	let optionAddress = options[0];

    console.log("Adding data to option: ", optionAddress);
	await call(collateral, CollateralFactory, bob).approve(optionAddress, 10_000);
	await attachOption(bob, optionAddress).underwrite(5_000, btcAddress);

    var details = await attachOption(alice, optionAddress).getOptionDetails();
    console.log("Option details: ", details.toString());

    console.log("Generating options with testdata");
    // generate the other options
    // until May 31, 2020
	await pool.createOption(1590883200, 11, 9000);
    // until June 7, 2020
	await pool.createOption(1591488000, 15, 9050);
	await pool.createOption(1591488000, 17, 8950);

	options = await pool.getOptions();

	optionAddress = options[1];
    console.log("Adding data to option: ", optionAddress);
    console.log("Bob underwriting 9000 Dai");
	await call(collateral, CollateralFactory, bob).approve(optionAddress, 9_000);
	await attachOption(bob, optionAddress).underwrite(9_000, btcAddress);
    console.log("Charlie underwriting 4000 Dai");
	await call(collateral, CollateralFactory, charlie).approve(optionAddress, 4_000);
	await attachOption(charlie, optionAddress).underwrite(3_000, btcAddress);

    details = await attachOption(alice, optionAddress).getOptionDetails();
    console.log("Option details: ", details.toString());

    console.log("Alice insuring 1 BTC");
	await call(collateral, CollateralFactory, alice).approve(optionAddress, 200);
	await attachOption(alice, optionAddress).insure(1, bobAddress);


	optionAddress = options[3];
    console.log("Adding data to option: ", optionAddress);
    console.log("Eve underwriting 20.000 Dai");
	await call(collateral, CollateralFactory, eve).approve(optionAddress, 20_000);
	await attachOption(eve, optionAddress).underwrite(20_000, btcAddress);

    console.log("Alice insuring 2 BTC");
	await call(collateral, CollateralFactory, dave).approve(optionAddress, 250*17);
	await attachOption(dave, optionAddress).insure(2, eveAddress);

    details = await attachOption(alice, optionAddress).getOptionDetails();
    console.log("Option details: ", details.toString());
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
