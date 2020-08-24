/* eslint-disable no-console */

import {ethers} from '@nomiclabs/buidler';
import {MockCollateralFactory} from '../typechain/MockCollateralFactory';
import {Signer, constants} from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import {
  deploy0,
  reconnect,
  deploy2,
  createPair,
  deploy1,
  AddressesPair,
  getRequestEvent
} from '../lib/contracts';
import {newBigNum} from '../lib/conversion';
import {OptionPairFactoryFactory} from '../typechain/OptionPairFactoryFactory';
import {OptionFactory} from '../typechain/OptionFactory';
import {deployUniswapFactory} from '../lib/uniswap';
import {OptionLibFactory} from '../typechain/OptionLibFactory';
import {Script} from '../lib/constants';
import {OptionPairFactory} from '../typechain/OptionPairFactory';
import {BigNumberish, BigNumber} from 'ethers';
import {MockCollateral} from '../typechain/MockCollateral';
import {BtcReferee} from '../typechain/BtcReferee';
import {OptionLib} from '../typechain/OptionLib';
import {
  BtcRefereeFactory,
  MockRelayFactory,
  WriterRegistryFactory,
  ObligationFactory
} from '../typechain';
import {evmFastForward, getCurrentTime} from '../lib/mock';
import BTCRefereeArtifact from '../artifacts/BTCReferee.json';
import {deployMockContract, MockContract} from 'ethereum-waffle';

const keyPair = bitcoin.ECPair.makeRandom();
const payment = bitcoin.payments.p2pkh({
  pubkey: keyPair.publicKey,
  network: bitcoin.networks.testnet
});
const btcHash = '0x' + payment.hash?.toString('hex');

async function createAndLockAndWrite(
  signer: Signer,
  optionLib: OptionLib,
  optionFactory: OptionPairFactory,
  expiryTime: BigNumberish,
  windowSize: BigNumberish,
  strikePrice: BigNumberish,
  collateral: MockCollateral,
  referee: MockContract,
  premium: BigNumber,
  amount: BigNumber
): Promise<AddressesPair> {
  const addressesPair = await createPair(
    optionFactory,
    expiryTime,
    windowSize,
    strikePrice,
    collateral.address,
    referee.address
  );
  const obligation = OptionFactory.connect(addressesPair.obligation, signer);

  console.log('Adding data to obligation: ', obligation.address);
  await reconnect(collateral, MockCollateralFactory, signer).approve(
    optionLib.address,
    amount.add(premium)
  );

  await reconnect(optionLib, OptionLibFactory, signer).lockAndWrite(
    obligation.address,
    collateral.address,
    collateral.address,
    amount,
    premium,
    amount,
    premium,
    btcHash,
    Script.p2pkh
  );

  return addressesPair;
}

async function main(): Promise<void> {
  const signers = await ethers.getSigners();

  const alice = signers[0];
  const bob = signers[1];
  const charlie = signers[2];
  const eve = signers[3];
  const dave = signers[4];

  const aliceAddress = await alice.getAddress();
  const bobAddress = await bob.getAddress();
  const charlieAddress = await charlie.getAddress();
  const eveAddress = await eve.getAddress();
  const daveAddress = await dave.getAddress();

  const collateral = await deploy0(signers[0], MockCollateralFactory);
  await collateral.mint(await signers[0].getAddress(), newBigNum(100_000, 18));
  const optionFactory = await deploy0(signers[0], OptionPairFactoryFactory);
  // TODO: make conditional
  const uniswapFactory = await deployUniswapFactory(alice, aliceAddress);
  const optionLib = await deploy2(
    signers[0],
    OptionLibFactory,
    uniswapFactory.address,
    constants.AddressZero
  );
  const relay = await deploy0(signers[0], MockRelayFactory);
  // const referee = await deploy1(signers[0], BtcRefereeFactory, relay.address);
  const referee = await deployMockContract(alice, BTCRefereeArtifact.abi);

  const writerRegistry = await deploy0(signers[0], WriterRegistryFactory);

  console.log('MockCollateral:', collateral.address);
  console.log('OptionPairFactory:', optionFactory.address);
  console.log('OptionLib:', optionLib.address);
  console.log('UniswapFactory:', uniswapFactory.address);
  console.log('MockRelay:', relay.address);
  console.log('BTCReferee:', referee.address);
  console.log('WriterRegistry:', writerRegistry.address);

  // get collateral for everyone
  await reconnect(collateral, MockCollateralFactory, alice).mint(
    aliceAddress,
    newBigNum(100_000, 18)
  );
  await reconnect(collateral, MockCollateralFactory, alice).mint(
    bobAddress,
    newBigNum(100_000, 18)
  );
  await reconnect(collateral, MockCollateralFactory, alice).mint(
    charlieAddress,
    newBigNum(100_000, 18)
  );
  await reconnect(collateral, MockCollateralFactory, alice).mint(
    eveAddress,
    newBigNum(100_000, 18)
  );
  await reconnect(collateral, MockCollateralFactory, alice).mint(
    daveAddress,
    newBigNum(100_000, 18)
  );

  console.log('Generating expired option');
  // get the current time
  const currentTime = await getCurrentTime();
  // generate and write option that expires in 60 secs
  const inOneMinute = currentTime + 60;

  console.log('Eve writing 15_000 Dai');
  const evePair = await createAndLockAndWrite(
    eve,
    optionLib,
    optionFactory,
    inOneMinute,
    2000,
    newBigNum(9_000, 18),
    collateral,
    referee,
    newBigNum(10, 18),
    newBigNum(15_000, 18)
  );

  // generate the other options
  const inTwoMinutes = currentTime + 60 + 60;
  const inAWeek = currentTime + 60 * 60 * 24 * 7;

  // -----

  console.log('Bob writing 9000 Dai');
  const bobPair = await createAndLockAndWrite(
    bob,
    optionLib,
    optionFactory,
    inTwoMinutes,
    2000,
    newBigNum(9000, 18),
    collateral,
    referee,
    newBigNum(11, 18),
    newBigNum(9_000, 18)
  );

  // -----

  console.log('Charlie writing 4000 Dai');
  await createAndLockAndWrite(
    charlie,
    optionLib,
    optionFactory,
    inAWeek,
    2000,
    newBigNum(9050, 18),
    collateral,
    referee,
    newBigNum(15, 18),
    newBigNum(4_000, 18)
  );

  // -----

  console.log('Alice insuring 0.8 BTC against Eve');
  const aliceAmountOut = BigNumber.from(0.8 * 10 ** 10)
    .mul(newBigNum(9_000, 18))
    .div(10 ** 10);

  const aliceAmountInMax = newBigNum(200, 18);
  console.log(`Options: ${aliceAmountOut.toString()}`);
  await reconnect(collateral, MockCollateralFactory, alice).approve(
    optionLib.address,
    aliceAmountInMax
  );
  await reconnect(optionLib, OptionLibFactory, alice).swapTokensForExactTokens(
    aliceAmountOut,
    aliceAmountInMax,
    [collateral.address, evePair.option],
    aliceAddress,
    inOneMinute
  );

  console.log('Alice requests exercise against eve');
  await evmFastForward(60);
  await ObligationFactory.connect(evePair.obligation, alice).requestExercise(
    eveAddress,
    BigNumber.from(0.8 * 10 ** 10)
  );

  // -----

  console.log('Dave insuring 0.5 BTC against Bob');
  const daveAmountOut = BigNumber.from(0.5 * 10 ** 10)
    .mul(newBigNum(9_000, 18))
    .div(10 ** 10);

  const daveAmountInMax = newBigNum(200, 18);
  console.log(`Options: ${daveAmountOut.toString()}`);
  await reconnect(collateral, MockCollateralFactory, dave).approve(
    optionLib.address,
    daveAmountInMax
  );
  await reconnect(optionLib, OptionLibFactory, dave).swapTokensForExactTokens(
    daveAmountOut,
    daveAmountInMax,
    [collateral.address, bobPair.option],
    daveAddress,
    inTwoMinutes
  );

  console.log('Dave exercises against bob');
  await evmFastForward(120);
  const obligation = ObligationFactory.connect(bobPair.obligation, dave);
  const tx = await obligation.requestExercise(
    bobAddress,
    BigNumber.from(0.5 * 10 ** 10)
  );
  const result = await getRequestEvent(
    obligation,
    daveAddress,
    bobAddress,
    await tx.wait(0)
  );
  await referee.mock.verifyTx.returns(BigNumber.from(0.5 * 10 ** 10));
  await ObligationFactory.connect(bobPair.obligation, dave).executeExercise(
    result.id,
    0,
    0,
    constants.HashZero,
    constants.HashZero,
    constants.HashZero,
    constants.HashZero
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
