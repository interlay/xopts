import { ethers } from "@nomiclabs/buidler";
import { OptionPool, MockCollateral, MockTxValidator, MockRelay, call, daiToWeiDai, premiumInDaiForOneBTC, strikePriceInDaiForOneBTC } from "./contracts";
import { CollateralFactory } from "../typechain/CollateralFactory";

async function main() {
  let signers = await ethers.signers();
  let alice = signers[0];

	const collateral = await MockCollateral(alice);
	const relay = await MockRelay(alice);
	const validator = await MockTxValidator(alice);
	let contract = await OptionPool(alice, collateral.address, relay.address, validator.address);

  let receipt = await contract.deployTransaction.wait(0);  
  console.log(`Gas [Deploy]: ${receipt.gasUsed?.toString()}`);

  let currentTime = Math.round(new Date().getTime()/1000);
	let expiry = currentTime + 60;

	let tx = await contract.createOption(expiry, premiumInDaiForOneBTC(10), strikePriceInDaiForOneBTC(9_200));
  receipt = await tx.wait(0);  
  console.log(`Gas [Create]: ${receipt.gasUsed?.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });