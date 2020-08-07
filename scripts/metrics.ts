import { ethers } from "@nomiclabs/buidler";
import { OptionPool, MockCollateral, MockTxValidator, MockRelay, call, daiToWeiDai, premiumInDaiForOneBTC, strikePriceInDaiForOneBTC, mbtcToSatoshi, getBuyableAndSellable } from "./contracts";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionPoolFactory } from "../typechain/OptionPoolFactory";
import { Script } from './constants';
import * as bitcoin from 'bitcoinjs-lib';
import { ERC20SellableFactory } from "../typechain/ERC20SellableFactory";

const payment = bitcoin.payments.p2wpkh({address: "tb1q2krsjrpj3z6xm7xvj2xxjy9gcxa755y0exegh6", network: bitcoin.networks.testnet});
const btcHash = '0x' + payment.hash?.toString('hex');

async function main() {
  let signers = await ethers.signers();
  let alice = signers[0];
  let bob = signers[1];
  let charlie = signers[2];

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

	let aliceAddress = await alice.getAddress();
  let bobAddress = await bob.getAddress();
  let charlieAddress = await charlie.getAddress();

  let options = await contract.getOptions();

  await call(collateral, CollateralFactory, alice).mint(aliceAddress, daiToWeiDai(100_000));
  await call(collateral, CollateralFactory, alice).mint(bobAddress, daiToWeiDai(100_000));
  
  await call(collateral, CollateralFactory, bob).approve(contract.address, daiToWeiDai(10_000));
	tx = await call(contract, OptionPoolFactory, bob).underwriteOption(options[0], daiToWeiDai(5_000), btcHash, Script.p2wpkh);
  receipt = await tx.wait(0);  
  console.log(`Gas [Underwrite]: ${receipt.gasUsed?.toString()}`);

  // transfer all unsold options to charlie
  let { sellableContract } = await getBuyableAndSellable(options[0], bob);
	tx = await sellableContract.transfer(charlieAddress, daiToWeiDai(5_000));
  receipt = await tx.wait(0);  
  console.log(`Gas [Transfer (Unsold)]: ${receipt.gasUsed?.toString()}`);
  await call(sellableContract, ERC20SellableFactory, charlie).setBtcAddress(btcHash, Script.p2wpkh);

  // alice claims against charlie's options
  await call(collateral, CollateralFactory, alice).approve(contract.address, daiToWeiDai(200));
	tx = await call(contract, OptionPoolFactory, alice).insureOption(options[0], charlieAddress, mbtcToSatoshi(100));
  receipt = await tx.wait(0);  
  console.log(`Gas [Insure]: ${receipt.gasUsed?.toString()}`);

  let { buyableContract } = await getBuyableAndSellable(options[0], alice);
  let balance = await buyableContract.balanceOf(aliceAddress);
	tx = await buyableContract.transfer(bobAddress, balance);
  receipt = await tx.wait(0);
  console.log(`Gas [Transfer (Sold)]: ${receipt.gasUsed?.toString()}`);

  const header = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const proof = "0x0000000000000000000000000000000000000000000000000000000000000000";

	tx = await call(contract, OptionPoolFactory, bob).exerciseOption(options[0], charlieAddress, 0, 0, header, proof, [0], [0]);
  receipt = await tx.wait(0);  
  console.log(`Gas [Exercise]: ${receipt.gasUsed?.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });