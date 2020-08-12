import chai from 'chai';
import {ethers} from '@nomiclabs/buidler';
import {Signer, constants} from 'ethers';
import {deploy0} from '../../lib/contracts';
import {OptionPairFactoryFactory} from '../../typechain/OptionPairFactoryFactory';
import {BigNumber, BigNumberish} from 'ethers';
import {OptionPairFactory} from '../../typechain/OptionPairFactory';
import {MockCollateralFactory} from '../../typechain';
import {MockCollateral} from '../../typechain/MockCollateral';
import {getTimeNow, deployPair} from '../common';

const {expect} = chai;

type args = {
  strike: BigNumberish;
  amount: BigNumberish;
  satoshis: BigNumberish;
};

describe('Conversion for number of obligation and option tokens with number of satoshis', () => {
  let alice: Signer;

  let optionFactory: OptionPairFactory;
  let collateral: MockCollateral;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;

  beforeEach('should deploy option factory', async () => {
    [alice] = await ethers.getSigners();
    optionFactory = await deploy0(alice, OptionPairFactoryFactory);
    collateral = await deploy0(alice, MockCollateralFactory);
  });

  it('should validate amountIn', async () => {
    const tests: args[] = [
      // 9000 strike, 0.5 BTC
      {
        // 18 decimals (e.g. Dai, USDC)
        strike: '9000000000000000000000',
        amount: '4500000000000000000000',
        satoshis: '5000000000'
      },
      {
        // 6 decimals (e.g. USDT)
        strike: '9000000000',
        amount: '4500000000',
        satoshis: '5000000000'
      },
      {
        // 0 decimals
        strike: '9000',
        amount: '4500',
        satoshis: '5000000000'
      },
      // 10000 strike, 0.25 BTC
      {
        // 18 decimals (e.g. Dai, USDC)
        strike: '10000000000000000000000',
        amount: '2500000000000000000000',
        satoshis: '2500000000'
      },
      {
        // 6 decimals (e.g. USDT)
        strike: '10000000000',
        amount: '2500000000',
        satoshis: '2500000000'
      },
      {
        // 0 decimals
        strike: '10000',
        amount: '2500',
        satoshis: '2500000000'
      }
    ];

    await Promise.all(
      tests.map(async (t) => {
        const {obligation} = await deployPair(
          optionFactory,
          expiryTime,
          windowSize,
          t.strike,
          collateral.address,
          constants.AddressZero,
          alice
        );
        const result = await obligation.calculateAmountIn(t.satoshis);
        expect(result).to.eq(t.amount);
      })
    );
  });

  it('should validate amountOut', async () => {
    const tests: args[] = [
      {
        strike: '9000000000000000000000',
        amount: '4500000000000000000000',
        satoshis: 0.5 * Math.pow(10, 10)
      },
      {
        strike: '9000000000',
        amount: '4500000000',
        satoshis: 0.5 * Math.pow(10, 10)
      },
      {
        strike: BigNumber.from(2390).mul(BigNumber.from(10).pow(18)),
        amount: '1199999999978000000000',
        satoshis: '5020920502'
      }
    ];

    await Promise.all(
      tests.map(async (t) => {
        const {obligation} = await deployPair(
          optionFactory,
          expiryTime,
          windowSize,
          t.strike,
          collateral.address,
          constants.AddressZero,
          alice
        );
        const output = await obligation.calculateAmountOut(t.amount);
        expect(output).to.eq(t.satoshis);
      })
    );
  });
});
