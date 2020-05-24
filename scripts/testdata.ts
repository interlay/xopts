import { ethers } from "@nomiclabs/buidler";
import { CollateralFactory } from "../typechain/CollateralFactory";
import {
	MockCollateral, MockRelay, MockTxValidator,
	MockRegistryAndResolver, OptionPool, call, attachOption,
    satoshiToMbtc, mbtcToSatoshi, mdaiToWeiDai, weiDaiToMdai, daiToWeiDai, premiumInDaiForOneBTC, strikePriceInDaiForOneBTC
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
	await call(collateral, CollateralFactory, alice).mint(aliceAddress, daiToWeiDai(100_000));
	await call(collateral, CollateralFactory, alice).mint(bobAddress, daiToWeiDai(100_000));
	await call(collateral, CollateralFactory, alice).mint(charlieAddress, daiToWeiDai(100_000));
	await call(collateral, CollateralFactory, alice).mint(eveAddress, daiToWeiDai(100_000));
	await call(collateral, CollateralFactory, alice).mint(daveAddress, daiToWeiDai(100_000));

    console.log("Generating expired option");
    // get the current time
    let current_time = Math.round(new Date().getTime()/1000);
    // generate and underwrite option that expires in 30 secs
    let expiry = current_time + 30;
    await pool.createOption(expiry, premiumInDaiForOneBTC(10), strikePriceInDaiForOneBTC(9_200));
	let options = await pool.getOptions();
	let optionAddress = options[0];

    console.log("Adding data to option: ", optionAddress);
	await call(collateral, CollateralFactory, bob).approve(optionAddress, daiToWeiDai(10_000));
	await attachOption(bob, optionAddress).underwrite(daiToWeiDai(5_000), btcAddress);

    var details = await attachOption(alice, optionAddress).getOptionDetails();
    console.log("Option details: ", details.toString());

    console.log("Generating options with testdata");
    // generate the other options
    // until May 31, 2020
	await pool.createOption(1590883200, premiumInDaiForOneBTC(11), strikePriceInDaiForOneBTC(9000));
    // until June 7, 2020
	await pool.createOption(1591488000, premiumInDaiForOneBTC(15), strikePriceInDaiForOneBTC(9050));
	await pool.createOption(1591488000, premiumInDaiForOneBTC(17), strikePriceInDaiForOneBTC(8950));

	options = await pool.getOptions();

	optionAddress = options[1];
    console.log("Adding data to option: ", optionAddress);
    console.log("Bob underwriting 9000 Dai");
	await call(collateral, CollateralFactory, bob).approve(optionAddress, daiToWeiDai(9_000));
	await attachOption(bob, optionAddress).underwrite(daiToWeiDai(9_000), btcAddress);
    console.log("Charlie underwriting 4000 Dai");
	await call(collateral, CollateralFactory, charlie).approve(optionAddress, daiToWeiDai(4_000));
	await attachOption(charlie, optionAddress).underwrite(daiToWeiDai(3_000), btcAddress);

    details = await attachOption(alice, optionAddress).getOptionDetails();
    console.log("Option details: ", details.toString());

    console.log("Alice insuring 0.8 BTC");
    console.log(strikePriceInDaiForOneBTC(9000).mul(mbtcToSatoshi(800)).toString());
	await call(collateral, CollateralFactory, alice).approve(optionAddress, daiToWeiDai(200));
	await attachOption(alice, optionAddress).insure(mbtcToSatoshi(800), bobAddress);


	optionAddress = options[3];
    console.log("Adding data to option: ", optionAddress);
    console.log("Eve underwriting 20.000 Dai");
	await call(collateral, CollateralFactory, eve).approve(optionAddress, daiToWeiDai(20_000));
	await attachOption(eve, optionAddress).underwrite(daiToWeiDai(20_000), btcAddress);

    console.log("Alice insuring 1.27 BTC");
	await call(collateral, CollateralFactory, dave).approve(optionAddress, daiToWeiDai(2*17));
	await attachOption(dave, optionAddress).insure(mbtcToSatoshi(1270), eveAddress);

    details = await attachOption(alice, optionAddress).getOptionDetails();
    console.log("Option details: ", details.toString());
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
