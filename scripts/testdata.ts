/* eslint-disable no-console */

import {ethers} from 'hardhat';
import {MockCollateralFactory} from '../typechain/MockCollateralFactory';
import {Signer, constants} from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import {
  deploy0,
  reconnect,
  deploy2,
  createPair,
  deploy1,
  AddressesPair
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
  TreasuryFactory
} from '../typechain';

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
  referee: BtcReferee,
  premium: BigNumber,
  amount: BigNumber
): Promise<AddressesPair> {
  console.log('Creating pair');
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

  await reconnect(optionLib, OptionLibFactory, signer).lockAndWriteToPool(
    obligation.address,
    collateral.address,
    collateral.address,
    amount,
    premium,
    amount,
    premium
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
  const uniswapFactory = await deployUniswapFactory(alice, aliceAddress);
  const optionFactory = await deploy1(
    signers[0],
    OptionPairFactoryFactory,
    uniswapFactory.address
  );
  // TODO: make conditional
  const optionLib = await deploy2(
    signers[0],
    OptionLibFactory,
    uniswapFactory.address,
    constants.AddressZero
  );
  const treasury = await deploy2(
    signers[0],
    TreasuryFactory,
    collateral.address,
    optionFactory.address
  );
  const relay = await deploy0(signers[0], MockRelayFactory);
  const referee = await deploy1(signers[0], BtcRefereeFactory, relay.address);
  const writerRegistry = await deploy0(signers[0], WriterRegistryFactory);

  console.log('MockCollateral:', collateral.address);
  console.log('OptionPairFactory:', optionFactory.address);
  console.log('OptionLib:', optionLib.address);
  console.log('UniswapFactory:', uniswapFactory.address);
  console.log('MockRelay:', relay.address);
  console.log('BTCReferee:', referee.address);
  console.log('WriterRegistry:', writerRegistry.address);

  await optionFactory.enableAsset(collateral.address);
  await optionFactory.setTreasuryFor(collateral.address, treasury.address);

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

  // register Bob as writer
  console.log('Registering Bob and setting position');
  await reconnect(treasury, TreasuryFactory, bob).setBtcAddress(
    btcHash,
    Script.p2pkh
  );

  // get the current time
  const currentTime = Math.round(new Date().getTime() / 1000);

  const inAYear = currentTime + 60 * 60 * 24 * 365;
  await reconnect(treasury, TreasuryFactory, bob).position(
    0,
    newBigNum(100_000, 18),
    inAYear,
    btcHash,
    Script.p2pkh
  );

  console.log('Generating expired option');
  // generate and write option that expires in 60 secs
  const inSixtySeconds = currentTime + 60;

  await createAndLockAndWrite(
    bob,
    optionLib,
    optionFactory,
    inSixtySeconds,
    2000,
    newBigNum(9_200, 18),
    collateral,
    referee,
    newBigNum(10, 18),
    newBigNum(5_000, 18)
  );

  // generate the other options
  const inAWeek = currentTime + 60 * 60 * 24 * 7;
  const inTwoWeeks = currentTime + 60 * 60 * 24 * 14;

  console.log('Bob underwriting 9000 Dai');
  await createAndLockAndWrite(
    bob,
    optionLib,
    optionFactory,
    inAWeek,
    2000,
    newBigNum(9000, 18),
    collateral,
    referee,
    newBigNum(11, 18),
    newBigNum(9_000, 18)
  );

  console.log('Charlie underwriting 4000 Dai');
  await createAndLockAndWrite(
    bob,
    optionLib,
    optionFactory,
    inTwoWeeks,
    2000,
    newBigNum(9050, 18),
    collateral,
    referee,
    newBigNum(15, 18),
    newBigNum(4_000, 18)
  );

  // console.log("Alice insuring 0.8 BTC");
  // console.log(newBigNum(9000, 18).mul(mbtcToSatoshi(800)).toString());
  // await call(collateral, MockCollateralFactory, alice).approve(pool.address, newBigNum(200));
  // await call(pool, OptionPoolFactory, alice).insureOption(sellableAddress, bobAddress, mbtcToSatoshi(800));

  // sellableAddress = options[3];
  // buyableAddress = await getBuyable(sellableAddress, bob)

  // console.log("Adding data to option: ", sellableAddress);
  // console.log("Eve underwriting 20.000 Dai");
  // await call(collateral, MockCollateralFactory, eve).approve(pool.address, newBigNum(20_000));
  // await call(pool, OptionPoolFactory, eve).writeOption(sellableAddress, newBigNum(20_000), btcHash, Script.p2wpkh);

  // console.log("Dave insuring 1.27 BTC");
  // await call(collateral, MockCollateralFactory, dave).approve(pool.address, newBigNum(2*17));
  // await call(pool, OptionPoolFactory, dave).insureOption(sellableAddress, eveAddress, mbtcToSatoshi(1270));

  // details = await attachSellableOption(alice, sellableAddress).getDetails();
  // console.log("Option details: ", details.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
