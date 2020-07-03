import { ethers } from "@nomiclabs/buidler";
import { ChainId, Token, TokenAmount, Pair } from "@uniswap/sdk";
import { CollateralFactory } from "../typechain/CollateralFactory";
import {
	MockRelay, MockTxValidator,
	MockRegistryAndResolver, OptionPool, call, mintDai,
    mbtcToSatoshi, daiToWeiDai, premiumInDaiForOneBTC, strikePriceInDaiForOneBTC,
    createUniswapPair, addLiquidity, getBuyableAndSellable, btcToSatoshi, Collateral, fetchData
} from "./contracts";
import { contracts } from "../contracts";
import { OptionPoolFactory } from "../typechain/OptionPoolFactory";
import * as bitcoin from 'bitcoinjs-lib';
import { Script } from './constants';
import { IERC20 } from "../typechain/IERC20";

const payment = bitcoin.payments.p2wpkh({address: "tb1q2krsjrpj3z6xm7xvj2xxjy9gcxa755y0exegh6", network: bitcoin.networks.testnet});
const btcHash = '0x' + payment.hash?.toString('hex');

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
	const collateral = await Collateral() as IERC20;
	const relay = await MockRelay(alice);
	const validator = await MockTxValidator(alice);
	const registry = await MockRegistryAndResolver(alice);

	let pool = await OptionPool(alice, collateral.address, relay.address, validator.address);

    console.log("Creating put option contracts");

	var date = new Date();
	let current_time = Math.round(date.getTime() / 1000);
	let inAWeek = current_time + (60 * 60 * 24 * 7);
	let inAMonth = current_time + (60 * 60 * 24 * 31);

    await pool.createOption(inAWeek, premiumInDaiForOneBTC(10), strikePriceInDaiForOneBTC(10_000));

	let options = await pool.getOptions();
    console.log("Deployed options: ", options.toString());

	await mintDai(collateral, aliceAddress, daiToWeiDai(200).toString());
	await mintDai(collateral, bobAddress, daiToWeiDai(2_000).toString());
	// await mintDai(collateral, charlieAddress, daiToWeiDai(20_000).toString());

	let optionAddress = options[0];
    console.log("Adding data to option: ", optionAddress);
    console.log("Bob underwriting 2,000 Dai");
    await call(collateral, CollateralFactory, bob).approve(pool.address, daiToWeiDai(2_000));
    await call(pool, OptionPoolFactory, bob).underwriteOption(optionAddress, daiToWeiDai(2_000), btcHash, Script.p2wpkh);

    // console.log("Charlie underwriting 7,500 Dai");
	// await call(collateral, CollateralFactory, charlie).approve(optionAddress, daiToWeiDai(7_500));
	// await attachOption(charlie, optionAddress).underwrite(daiToWeiDai(7_500), btcAddress);
    let { sellableContract, buyableContract } = await getBuyableAndSellable(optionAddress, alice);
    let details = await sellableContract.getDetails();
    console.log("Option details: ", details.toString());

    console.log(`Alice insuring 0.2 BTC`);
	await call(collateral, CollateralFactory, alice).approve(pool.address, daiToWeiDai(200));
    await call(pool, OptionPoolFactory, alice).insureOption(optionAddress, bobAddress, btcToSatoshi(0.2));

    // Uniswap
    // get the tokens
    const collateral_token = new Token(3, collateral.address, 18, 'DAI', 'Dai');
    const option_token = new Token(3, buyableContract.address, 18, 'putBTC', 'BTC_put_option');

    // create a Dai to option token pair with the trading price at the current premium
    const DAI_putBTC = new Pair(
        new TokenAmount(collateral_token, daiToWeiDai(2).toString()),
        new TokenAmount(option_token, btcToSatoshi(0.2).toString())
    );

    const pairAddress = Pair.getAddress(collateral_token, option_token);
    await createUniswapPair(alice, collateral.address, buyableContract.address);
    console.log("Created Uniswap pair address at: ", pairAddress);

    console.log("Adding liquidity from Alice to Uniswap");
    const aliceDaiBalance = await collateral.balanceOf(aliceAddress);
    const aliceXOptBalance = await buyableContract.balanceOf(aliceAddress);

    console.log("Alice Dai balance: ", aliceDaiBalance.toString());
    console.log("Alice Options balance: ", aliceXOptBalance.toString());

    const liquidityDai = aliceDaiBalance;
    const liquidityOption = aliceXOptBalance;
    const fromAliceCollateral = collateral.connect(alice);
    await fromAliceCollateral.approve("0xf164fC0Ec4E93095b804a4795bBe1e041497b92a", liquidityDai);
    await buyableContract.approve("0xf164fC0Ec4E93095b804a4795bBe1e041497b92a", liquidityOption);
    console.log("Creating pair tokens");
    await addLiquidity(
        alice,
        collateral,
        buyableContract,
        liquidityDai,
        liquidityOption,
        0,
        0,
        aliceAddress,
        inAWeek,
        pairAddress
    );

    let pairData = await fetchData(alice, collateral_token, option_token, pairAddress);

    console.log("Alice Dai balance: ", (await collateral.balanceOf(aliceAddress)).toString());
    console.log("Alice Options balance: ", (await buyableContract.balanceOf(aliceAddress)).toString());
    console.log("Liquidity Dai balance: ", pairData.reserveOf(collateral_token).toFixed());
    console.log("Liquidity Options balance: ", pairData.reserveOf(option_token).toFixed());
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
