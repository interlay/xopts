import { ethers } from "@nomiclabs/buidler";
import { CollateralFactory } from "../typechain/CollateralFactory";
import {
	MockCollateral, MockRelay, MockTxValidator,
	MockRegistryAndResolver, OptionPool, call, attachSellableOption, attachBuyableOption,
    satoshiToMbtc, mbtcToSatoshi, mdaiToWeiDai, weiDaiToMdai, daiToWeiDai, premiumInDaiForOneBTC, strikePriceInDaiForOneBTC
} from "./contracts";
import { Signer } from "ethers";

let btcAddress = ethers.utils.toUtf8Bytes("19fkEq227H56rqwwjEoGg12rctq1c8L3a4");

function getBuyable(address: string, signer: Signer) {
	return attachSellableOption(signer, address).getBuyable();
}

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

	let pool = await OptionPool(alice, collateral.address, relay.address, validator.address);

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

	let sellableAddress = options[0];
	let buyableAddress = await getBuyable(sellableAddress, bob)

    console.log("Adding data to option: ", sellableAddress);
	await call(collateral, CollateralFactory, bob).approve(sellableAddress, daiToWeiDai(10_000));
	await attachSellableOption(bob, sellableAddress).underwrite(daiToWeiDai(5_000), btcAddress);

    var details = await attachSellableOption(alice, sellableAddress).getDetails();
    console.log("Option details: ", details.toString());

    console.log("Generating options with testdata");
    // generate the other options
    // until May 31, 2020
	await pool.createOption(1590883200, premiumInDaiForOneBTC(11), strikePriceInDaiForOneBTC(9000));
    // until June 7, 2020
	await pool.createOption(1591488000, premiumInDaiForOneBTC(15), strikePriceInDaiForOneBTC(9050));
	await pool.createOption(1591488000, premiumInDaiForOneBTC(17), strikePriceInDaiForOneBTC(8950));

	options = await pool.getOptions();

	sellableAddress = options[1];
	buyableAddress = await getBuyable(sellableAddress, bob)

    console.log("Adding data to option: ", sellableAddress);
    console.log("Bob underwriting 9000 Dai");
	await call(collateral, CollateralFactory, bob).approve(sellableAddress, daiToWeiDai(9_000));
	await attachSellableOption(bob, sellableAddress).underwrite(daiToWeiDai(9_000), btcAddress);
    console.log("Charlie underwriting 4000 Dai");
	await call(collateral, CollateralFactory, charlie).approve(sellableAddress, daiToWeiDai(4_000));
	await attachSellableOption(charlie, sellableAddress).underwrite(daiToWeiDai(3_000), btcAddress);

    details = await attachSellableOption(alice, sellableAddress).getDetails();
    console.log("Option details: ", details.toString());

    console.log("Alice insuring 0.8 BTC");
    console.log(strikePriceInDaiForOneBTC(9000).mul(mbtcToSatoshi(800)).toString());
	await call(collateral, CollateralFactory, alice).approve(buyableAddress, daiToWeiDai(200));
	await attachBuyableOption(alice, buyableAddress).insure(bobAddress, mbtcToSatoshi(800));

	sellableAddress = options[3];
	buyableAddress = await getBuyable(sellableAddress, bob)

    console.log("Adding data to option: ", sellableAddress);
    console.log("Eve underwriting 20.000 Dai");
	await call(collateral, CollateralFactory, eve).approve(sellableAddress, daiToWeiDai(20_000));
	await attachSellableOption(eve, sellableAddress).underwrite(daiToWeiDai(20_000), btcAddress);

    console.log("Alice insuring 1.27 BTC");
	await call(collateral, CollateralFactory, dave).approve(buyableAddress, daiToWeiDai(2*17));
	await attachBuyableOption(dave, buyableAddress).insure(eveAddress, mbtcToSatoshi(1270));

    details = await attachSellableOption(alice, sellableAddress).getDetails();
    console.log("Option details: ", details.toString());
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
