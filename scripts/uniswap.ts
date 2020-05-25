import { ethers } from "@nomiclabs/buidler";
import { ChainId, Token, TokenAmount, Pair } from "@uniswap/sdk";
import { CollateralFactory } from "../typechain/CollateralFactory";
import {
	Collateral, MockRelay, MockTxValidator,
	MockRegistryAndResolver, OptionPool, call, attachOption, mintDai,
    satoshiToMbtc, mbtcToSatoshi, mdaiToWeiDai, weiDaiToMdai, daiToWeiDai, premiumInDaiForOneBTC, strikePriceInDaiForOneBTC,
    createUniswapPair, addLiquidity
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

    // use real Dai contract here
	const collateral = await Collateral();
	const relay = await MockRelay(alice);
	const validator = await MockTxValidator(alice);
	const registry = await MockRegistryAndResolver(alice);

	let pool = await OptionPool(alice, collateral.address, relay.address, validator.address, registry.address);

    console.log("Creating put option contracts");
    // until May 31, 2020
	await pool.createOption(1590883200, premiumInDaiForOneBTC(10), strikePriceInDaiForOneBTC(10_000));

	let options = await pool.getOptions();
    console.log("Deployed options: ", options.toString());

	await mintDai(collateral, aliceAddress, daiToWeiDai(200).toString());
	await mintDai(collateral, bobAddress, daiToWeiDai(2_000).toString());
	// await mintDai(collateral, charlieAddress, daiToWeiDai(20_000).toString());

	let optionAddress = options[0];
    console.log("Adding data to option: ", optionAddress);
    console.log("Bob underwriting 2,000 Dai");
	await call(collateral, CollateralFactory, bob).approve(optionAddress, daiToWeiDai(2_000));
	await attachOption(bob, optionAddress).underwrite(daiToWeiDai(2_000), btcAddress);
    // console.log("Charlie underwriting 7,500 Dai");
	// await call(collateral, CollateralFactory, charlie).approve(optionAddress, daiToWeiDai(7_500));
	// await attachOption(charlie, optionAddress).underwrite(daiToWeiDai(7_500), btcAddress);
    var details = await attachOption(alice, optionAddress).getOptionDetails();
    console.log("Option details: ", details.toString());

    console.log("Alice insuring 0.2 BTC");
	await call(collateral, CollateralFactory, alice).approve(optionAddress, daiToWeiDai(200));
	await attachOption(alice, optionAddress).insure(mbtcToSatoshi(200), bobAddress);

    // Uniswap
    // get the tokens
    const collateral_token = new Token(3, collateral.address, 18, 'DAI', 'Dai');
    const option_token = new Token(3, optionAddress, 18, 'putBTC', 'BTC_put_option');

    // create a Dai to option token pair with the trading price at the current premium
    const DAI_putBTC = new Pair(
        new TokenAmount(collateral_token, daiToWeiDai(2).toString()),
        new TokenAmount(option_token, mbtcToSatoshi(200).toString())
    );

    const pairAddress = Pair.getAddress(collateral_token, option_token);
    await createUniswapPair(alice, collateral.address, optionAddress);

    console.log("Created Uniswap pair address at: ", pairAddress);

    console.log("Adding liquidity from Alice to Uniswap");
    console.log("Alice Dai balance: ", (await collateral.balanceOf(aliceAddress)).toString());
    console.log("Alice Options balance: ", (await attachOption(alice, optionAddress).balanceOf(aliceAddress)).toString());

    const liquidityDai = daiToWeiDai(2).toString();
    const liquidityOption = mbtcToSatoshi(200).toString();
    const fromAliceCollateral = collateral.connect(alice);
    await fromAliceCollateral.approve("0xf164fC0Ec4E93095b804a4795bBe1e041497b92a", liquidityDai);
    await attachOption(alice, optionAddress).approve("0xf164fC0Ec4E93095b804a4795bBe1e041497b92a", liquidityOption);
    console.log("Creating pair tokens");
    // await addLiquidity(
    //     alice,
    //     collateral.address,
    //     optionAddress,
    //     liquidityDai,
    //     liquidityOption,
    //     "0",
    //     "0",
    //     aliceAddress,
    //     1590883200
    // );

    // let pairData = await Pair.fetchData(collateral_token, option_token);

    // console.log("Alice Dai balance: ", (await collateral.balanceOf(aliceAddress)).toString());
    // console.log("Alice Options balance: ", (await attachOption(alice, optionAddress).balanceOf(aliceAddress)).toString());
    // console.log("Liquidity Dai balance: ", (await pairData.reserveOf(collateral_token)).toString());
    // console.log("Liquidity Options balance: ", (await pairData.reserveOf(option_token)).toString());
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
