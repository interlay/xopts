import { ethers } from "@nomiclabs/buidler";
import { ChainId, Token, TokenAmount, Pair } from "@uniswap/sdk";
import { CollateralFactory } from "../typechain/CollateralFactory";
import {
	Collateral, MockRelay, MockTxValidator,
	MockRegistryAndResolver, OptionPool, call, attachOption, mintDai,
    satoshiToMbtc, mbtcToSatoshi, mdaiToWeiDai, weiDaiToMdai, daiToWeiDai
} from "./contracts";
import contracts from "../contracts";

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

    // use real Dai contract here
	const collateral = await Collateral();
	const relay = await MockRelay(alice);
	const validator = await MockTxValidator(alice);
	const registry = await MockRegistryAndResolver(alice);

	let pool = await OptionPool(alice, collateral.address, relay.address, validator.address, registry.address);

    console.log("Creating put option contracts");
    // until May 31, 2020
	await pool.createOption(1590883200, mdaiToWeiDai(10), daiToWeiDai(9000));
    // until June 7, 2020
	// await pool.createOption(1591488000, 15, 9100);
	// await pool.createOption(1591488000, 17, 9150);

	let options = await pool.getOptions();
    console.log("Deployed options: ", options.toString());

	await mintDai(collateral, aliceAddress, daiToWeiDai(20));
	await mintDai(collateral, bobAddress, daiToWeiDai(100));
	await mintDai(collateral, charlieAddress, daiToWeiDai(100));
	// await mintDai(collateral, daveAddress, 1_000_000);
	// await mintDai(collateral, eveAddress, 1_000_000);

	let optionAddress = options[0];
	await call(collateral, CollateralFactory, bob).approve(optionAddress, daiToWeiDai(100));
	await attachOption(bob, optionAddress).underwrite(daiToWeiDai(100), btcAddress);
	await call(collateral, CollateralFactory, charlie).approve(optionAddress, daiToWeiDai(75));
	await attachOption(charlie, optionAddress).underwrite(daiToWeiDai(75), btcAddress);

	await call(collateral, CollateralFactory, alice).approve(optionAddress, daiToWeiDai(20));
	await attachOption(alice, optionAddress).insure(mbtcToSatoshi(100), bobAddress);

	// optionAddress = options[2];
	// await call(collateral, CollateralFactory, eve).approve(optionAddress, 700);
	// await attachOption(eve, optionAddress).underwrite(700, btcAddress);

	// await call(collateral, CollateralFactory, dave).approve(optionAddress, 250*5);
	// await attachOption(dave, optionAddress).insure(250, eveAddress);

    // Uniswap
    // get the tokens
    const collateral_token = new Token(3, collateral.address, 18, 'DAI', 'Dai');
    const option_token = new Token(3, optionAddress, 18, 'putBTC', 'BTC_put_option');

    // Charlie buys the options
    // await
    // const DAI_putBTC = new Pair(
    //     new TokenAmount(collateral_token, '
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
