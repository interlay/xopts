import { ethers } from "@nomiclabs/buidler";
import { newBigNum } from "../lib/conversion";
import { MockCollateralFactory } from "../typechain/MockCollateralFactory";
import { Script } from '../lib/constants';
import * as bitcoin from 'bitcoinjs-lib';
import { deploy0, reconnect } from "../lib/contracts";
import { MockBtcRefereeFactory } from "../typechain/MockBtcRefereeFactory";
import { OptionPairFactoryFactory } from "../typechain/OptionPairFactoryFactory";
import { OptionFactory } from "../typechain/OptionFactory";

const payment = bitcoin.payments.p2wpkh({address: "tb1q2krsjrpj3z6xm7xvj2xxjy9gcxa755y0exegh6", network: bitcoin.networks.testnet});
const btcHash = '0x' + payment.hash?.toString('hex');

async function main() {
  let signers = await ethers.getSigners();
  let alice = signers[0];
  let bob = signers[1];
  let charlie = signers[2];

  const collateral = await deploy0(alice, MockCollateralFactory);
  const referee = await deploy0(alice, MockBtcRefereeFactory);

  let contract = await deploy0(alice, OptionPairFactoryFactory);

  let receipt = await contract.deployTransaction.wait(0);  
  console.log(`Gas [Deploy]: ${receipt.gasUsed?.toString()}`);

  let currentTime = Math.round(new Date().getTime()/1000);
	let expiry = currentTime + 60;

	let tx = await contract.createPair(expiry, 2000, newBigNum(9_200, 18), collateral.address, referee.address);
  receipt = await tx.wait(0);  
  console.log(`Gas [Create]: ${receipt.gasUsed?.toString()}`);

	let aliceAddress = await alice.getAddress();
  let bobAddress = await bob.getAddress();
  let charlieAddress = await charlie.getAddress();

  let options = await contract.getOptions();

  await reconnect(collateral, MockCollateralFactory, alice).mint(aliceAddress, newBigNum(100_000, 18));
  await reconnect(collateral, MockCollateralFactory, alice).mint(bobAddress, newBigNum(100_000, 18));
  
  await reconnect(collateral, MockCollateralFactory, bob).approve(contract.address, newBigNum(10_000, 18));
	tx = await reconnect(contract, OptionPairFactoryFactory, bob).underwriteOption(options[0], newBigNum(5_000, 18), btcHash, Script.p2wpkh);
  receipt = await tx.wait(0);  
  console.log(`Gas [Underwrite]: ${receipt.gasUsed?.toString()}`);

  // transfer all unsold options to charlie
  let optionAddress = options[0];
  let option = OptionFactory.connect(optionAddress, bob);

  tx = await option.transfer(charlieAddress, newBigNum(5_000, 18));
  receipt = await tx.wait(0);  
  console.log(`Gas [Transfer (Unsold)]: ${receipt.gasUsed?.toString()}`);
  await reconnect(option, OptionFactory, charlie).setBtcAddress(btcHash, Script.p2wpkh);

  // alice claims against charlie's options
  // await reconnect(collateral, MockCollateralFactory, alice).approve(contract.address, daiToWeiDai(200));
	// tx = await reconnect(contract, OptionPairFactoryFactory, alice).insureOption(options[0], charlieAddress, mbtcToSatoshi(100));
  // receipt = await tx.wait(0);  
  // console.log(`Gas [Insure]: ${receipt.gasUsed?.toString()}`);

  // let { buyableContract } = await getBuyableAndSellable(options[0], alice);
  // let balance = await buyableContract.balanceOf(aliceAddress);
	// tx = await buyableContract.transfer(bobAddress, balance);
  // receipt = await tx.wait(0);  
  // console.log(`Gas [Transfer (Sold)]: ${receipt.gasUsed?.toString()}`);

	// tx = await reconnect(contract, OptionPoolFactory, bob).exerciseOption(options[0], charlieAddress, 0, 0, "0x0000000000000000000000000000000000000000000000000000000000000000", [0], [0]);
  // receipt = await tx.wait(0);  
  // console.log(`Gas [Exercise]: ${receipt.gasUsed?.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });