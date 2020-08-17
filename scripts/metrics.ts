/* eslint-disable no-console */

import {ethers} from '@nomiclabs/buidler';
import {newBigNum} from '../lib/conversion';
import {MockCollateralFactory} from '../typechain/MockCollateralFactory';
import {Script} from '../lib/constants';
import * as bitcoin from 'bitcoinjs-lib';
import {deploy0, reconnect} from '../lib/contracts';
import {MockBtcRefereeFactory} from '../typechain/MockBtcRefereeFactory';
import {OptionPairFactoryFactory} from '../typechain/OptionPairFactoryFactory';
import {OptionFactory} from '../typechain/OptionFactory';

const payment = bitcoin.payments.p2wpkh({
  address: 'tb1q2krsjrpj3z6xm7xvj2xxjy9gcxa755y0exegh6',
  network: bitcoin.networks.testnet
});
const btcHash = '0x' + payment.hash?.toString('hex');

async function main(): Promise<void> {
  const signers = await ethers.getSigners();
  const alice = signers[0];
  const bob = signers[1];
  const charlie = signers[2];

  const collateral = await deploy0(alice, MockCollateralFactory);
  const referee = await deploy0(alice, MockBtcRefereeFactory);

  const contract = await deploy0(alice, OptionPairFactoryFactory);

  let receipt = await contract.deployTransaction.wait(0);
  console.log(`Gas [Deploy]: ${receipt.gasUsed?.toString()}`);

  const currentTime = Math.round(new Date().getTime() / 1000);
  const expiry = currentTime + 60;

  let tx = await contract.createPair(
    expiry,
    2000,
    newBigNum(9_200, 18),
    collateral.address,
    referee.address
  );
  receipt = await tx.wait(0);
  console.log(`Gas [Create]: ${receipt.gasUsed?.toString()}`);

  const aliceAddress = await alice.getAddress();
  const bobAddress = await bob.getAddress();
  const charlieAddress = await charlie.getAddress();

  const options = await contract.getOptions();

  await reconnect(collateral, MockCollateralFactory, alice).mint(
    aliceAddress,
    newBigNum(100_000, 18)
  );
  await reconnect(collateral, MockCollateralFactory, alice).mint(
    bobAddress,
    newBigNum(100_000, 18)
  );

  await reconnect(collateral, MockCollateralFactory, bob).approve(
    contract.address,
    newBigNum(10_000, 18)
  );
  tx = await reconnect(contract, OptionPairFactoryFactory, bob).writeOption(
    options[0],
    newBigNum(5_000, 18),
    btcHash,
    Script.p2wpkh
  );
  receipt = await tx.wait(0);
  console.log(`Gas [write]: ${receipt.gasUsed?.toString()}`);

  // transfer all unsold options to charlie
  const optionAddress = options[0];
  const option = OptionFactory.connect(optionAddress, bob);

  tx = await option.transfer(charlieAddress, newBigNum(5_000, 18));
  receipt = await tx.wait(0);
  console.log(`Gas [Transfer (Unsold)]: ${receipt.gasUsed?.toString()}`);
  await reconnect(option, OptionFactory, charlie).setBtcAddress(
    btcHash,
    Script.p2wpkh
  );

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
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
