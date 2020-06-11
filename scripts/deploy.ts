import { ethers } from "@nomiclabs/buidler";
import {
	TxValidator, OptionPool, MockCollateral, daiToWeiDai, premiumInDaiForOneBTC, strikePriceInDaiForOneBTC
} from "./contracts";

// ROPSTEN

const relay = "0xADBF61ecBa3799Db71005F6b49fac8A5C2ab6C86";

async function main() {
	let signers = await ethers.signers();

	const collateral = await MockCollateral(signers[0]);
	await collateral.mint(await signers[0].getAddress(), daiToWeiDai(100_000));

	const validator = await TxValidator(signers[0]);
	let pool = await OptionPool(signers[0], collateral.address, relay, validator.address);

	var date = new Date();
	let current_time = Math.round(new Date().getTime()/1000);
  let inAWeek = current_time + (60 * 60 * 24 * 7);
  let inAMonth = current_time + (60 * 60 * 24 * 31);

  // hard coded pricing under the assumption of
  // BTC at 9822 USD
  // strike price as indicated
  // interest rate 3.9% (see https://www.coingecko.com/en/earn/bitcoin)
  // dividend yield 3.9% (see https://www.coingecko.com/en/earn/bitcoin)
  // volatility per year 48.5% (see https://www.bitpremier.com/volatility-index)
  // time to expiration as indicated
  // premium based on Amercian option calculated by http://www.math.columbia.edu/~smirnov/options13.html
	await pool.createOption(inAWeek, premiumInDaiForOneBTC(131), strikePriceInDaiForOneBTC(9_500));
	await pool.createOption(inAWeek, premiumInDaiForOneBTC(66), strikePriceInDaiForOneBTC(9_250));
	await pool.createOption(inAWeek, premiumInDaiForOneBTC(28), strikePriceInDaiForOneBTC(9_000));
	await pool.createOption(inAMonth, premiumInDaiForOneBTC(391), strikePriceInDaiForOneBTC(9_500));
	await pool.createOption(inAMonth, premiumInDaiForOneBTC(303), strikePriceInDaiForOneBTC(9_250));
	await pool.createOption(inAMonth, premiumInDaiForOneBTC(216), strikePriceInDaiForOneBTC(9_000));
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
