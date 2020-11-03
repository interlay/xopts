/* eslint-disable no-console */

import {ethers} from 'hardhat';
import {deploy0, deploy1, deploy2} from '../lib/contracts';
import {MockCollateralFactory} from '../typechain/MockCollateralFactory';
import {OptionPairFactoryFactory} from '../typechain/OptionPairFactoryFactory';
import {BtcRefereeFactory} from '../typechain/BtcRefereeFactory';
import {OptionLibFactory} from '../typechain/OptionLibFactory';
import {TreasuryFactory} from '../typechain/TreasuryFactory';
import {deployUniswapFactory} from '../lib/uniswap';
import {MockRelayFactory} from '../typechain/MockRelayFactory';
import {constants} from 'ethers';
import {newBigNum} from '../lib/conversion';
import {WriterRegistryFactory} from '../typechain';

// ROPSTEN

// const relay = "0x78A389B693e0E3DE1849F34e70bf4Bcb57F0F2bb";
const overrides = {
  gasLimit: 5_000_000,
  gasPrice: ethers.utils.parseUnits('20.0', 'gwei')
};

async function main(): Promise<void> {
  const signers = await ethers.getSigners();
  const account = await signers[0].getAddress();

  const collateral = await deploy0(signers[0], MockCollateralFactory);
  await collateral.mint(await signers[0].getAddress(), newBigNum(100_000, 18));
  // TODO: make conditional?
  const uniswapFactory = await deployUniswapFactory(signers[0], account);
  const optionFactory = await deploy1(
    signers[0],
    OptionPairFactoryFactory,
    uniswapFactory.address
  );
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

  const date = new Date();
  const currentTime = Math.round(date.getTime() / 1000);
  const inAWeek = currentTime + 60 * 60 * 24 * 7;
  const inAMonth = currentTime + 60 * 60 * 24 * 31;

  // hard coded pricing under the assumption of
  // BTC at 9822 USD
  // strike price as indicated
  // interest rate 3.9% (see https://www.coingecko.com/en/earn/bitcoin)
  // dividend yield 3.9% (see https://www.coingecko.com/en/earn/bitcoin)
  // volatility per year 48.5% (see https://www.bitpremier.com/volatility-index)
  // time to expiration as indicated
  // premium based on American option calculated by http://www.math.columbia.edu/~smirnov/options.html
  await optionFactory.createPair(
    inAWeek,
    2000,
    newBigNum(9_100, 18),
    collateral.address,
    referee.address,
    overrides
  );
  await optionFactory.createPair(
    inAWeek,
    2000,
    newBigNum(8_850, 18),
    collateral.address,
    referee.address,
    overrides
  );
  await optionFactory.createPair(
    inAWeek,
    2000,
    newBigNum(8_600, 18),
    collateral.address,
    referee.address,
    overrides
  );
  await optionFactory.createPair(
    inAMonth,
    2000,
    newBigNum(9_100, 18),
    collateral.address,
    referee.address,
    overrides
  );
  await optionFactory.createPair(
    inAMonth,
    2000,
    newBigNum(8_850, 18),
    collateral.address,
    referee.address,
    overrides
  );
  await optionFactory.createPair(
    inAMonth,
    2000,
    newBigNum(8_600, 18),
    collateral.address,
    referee.address,
    overrides
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
