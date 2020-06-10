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
	date.setFullYear(date.getFullYear() + 1);
	let expiry = Math.round(date.getTime()/1000);

	await pool.createOption(expiry, premiumInDaiForOneBTC(10), strikePriceInDaiForOneBTC(9_200));
	await pool.createOption(expiry, premiumInDaiForOneBTC(11), strikePriceInDaiForOneBTC(9000));
	await pool.createOption(expiry, premiumInDaiForOneBTC(17), strikePriceInDaiForOneBTC(8950));
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
