import { ethers } from "@nomiclabs/buidler";
import {
	daiToWeiDai, strikePriceInDaiForOneBTC
} from "../lib/conversion";
import { deploy0, deploy1 } from "../lib/contracts";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionPairFactoryFactory } from "../typechain/OptionPairFactoryFactory";
import { BTCRefereeFactory } from "../typechain/BTCRefereeFactory";

// ROPSTEN

const relay = "0x78A389B693e0E3DE1849F34e70bf4Bcb57F0F2bb";
let overrides = {
  gasLimit: 5_000_000,
  gasPrice: ethers.utils.parseUnits('20.0', 'gwei'),
}

async function main() {
	let signers = await ethers.signers();

	const collateral = await deploy0(signers[0], CollateralFactory);
	await collateral.mint(await signers[0].getAddress(), daiToWeiDai(100_000));
	const referee = await deploy1(signers[0], BTCRefereeFactory, relay);
	const optionFactory = await deploy0(signers[0], OptionPairFactoryFactory);

	var date = new Date();
	let current_time = Math.round(date.getTime() / 1000);
	let inAWeek = current_time + (60 * 60 * 24 * 7);
	let inAMonth = current_time + (60 * 60 * 24 * 31);

	// hard coded pricing under the assumption of
	// BTC at 9822 USD
	// strike price as indicated
	// interest rate 3.9% (see https://www.coingecko.com/en/earn/bitcoin)
	// dividend yield 3.9% (see https://www.coingecko.com/en/earn/bitcoin)
	// volatility per year 48.5% (see https://www.bitpremier.com/volatility-index)
	// time to expiration as indicated
	// premium based on American option calculated by http://www.math.columbia.edu/~smirnov/options.html
	await optionFactory.createOption(inAWeek, 2000, strikePriceInDaiForOneBTC(9_100), collateral.address, referee.address, overrides);
	await optionFactory.createOption(inAWeek, 2000, strikePriceInDaiForOneBTC(8_850), collateral.address, referee.address, overrides);
	await optionFactory.createOption(inAWeek, 2000, strikePriceInDaiForOneBTC(8_600), collateral.address, referee.address, overrides);
	await optionFactory.createOption(inAMonth, 2000, strikePriceInDaiForOneBTC(9_100), collateral.address, referee.address, overrides);
	await optionFactory.createOption(inAMonth, 2000, strikePriceInDaiForOneBTC(8_850), collateral.address, referee.address, overrides);
	await optionFactory.createOption(inAMonth, 2000, strikePriceInDaiForOneBTC(8_600), collateral.address, referee.address, overrides);
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
