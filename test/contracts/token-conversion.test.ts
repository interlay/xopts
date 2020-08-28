import chai from 'chai';
import {ethers} from '@nomiclabs/buidler';
import {Signer, constants} from 'ethers';
import {deploy1} from '../../lib/contracts';
import {OptionPairFactoryFactory} from '../../typechain/OptionPairFactoryFactory';
import {BigNumber, BigNumberish} from 'ethers';
import {OptionPairFactory} from '../../typechain/OptionPairFactory';
import {getTimeNow, deployPair} from '../common';
import {MockContract, deployMockContract} from 'ethereum-waffle';
import IUniswapV2FactoryArtifact from '../../artifacts/IUniswapV2Factory.json';
import IERC20Artifact from '../../artifacts/IERC20.json';

const {expect} = chai;

type args = {
  strike: BigNumberish;
  amount: BigNumberish;
  satoshis: BigNumberish;
  decimals: number;
};

describe('Conversion for number of obligation and option tokens with number of satoshis', () => {
  let alice: Signer;

  let optionFactory: OptionPairFactory;
  let uniswapFactory: MockContract;
  let collateral: MockContract;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;

  beforeEach('should deploy option factory', async () => {
    [alice] = await ethers.getSigners();
    uniswapFactory = await deployMockContract(
      alice,
      IUniswapV2FactoryArtifact.abi
    );
    optionFactory = await deploy1(
      alice,
      OptionPairFactoryFactory,
      uniswapFactory.address
    );
    collateral = await deployMockContract(alice, IERC20Artifact.abi);
  });

  it('should validate amountIn', async () => {
    const tests: args[] = [
      // 9000 strike, 0.5 BTC
      {
        // 18 decimals (e.g. Dai, USDC)
        strike: '9000000000000000000000',
        amount: '4500000000000000000000',
        satoshis: '5000000000',
        decimals: 18
      },
      {
        // 6 decimals (e.g. USDT)
        strike: '9000000000',
        amount: '4500000000',
        satoshis: '5000000000',
        decimals: 6
      },
      {
        // 0 decimals
        strike: '9000',
        amount: '4500',
        satoshis: '5000000000',
        decimals: 0
      },
      // 10000 strike, 0.25 BTC
      {
        // 18 decimals (e.g. Dai, USDC)
        strike: '10000000000000000000000',
        amount: '2500000000000000000000',
        satoshis: '2500000000',
        decimals: 18
      },
      {
        // 6 decimals (e.g. USDT)
        strike: '10000000000',
        amount: '2500000000',
        satoshis: '2500000000',
        decimals: 6
      },
      {
        // 0 decimals
        strike: '10000',
        amount: '2500',
        satoshis: '2500000000',
        decimals: 6
      }
    ];

    await Promise.all(
      tests.map(async (t) => {
        await collateral.mock.decimals.returns(t.decimals);
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
        satoshis: 0.5 * Math.pow(10, 10),
        decimals: 18
      },
      {
        strike: '9000000000',
        amount: '4500000000',
        satoshis: 0.5 * Math.pow(10, 10),
        decimals: 6
      },
      {
        strike: BigNumber.from(2390).mul(BigNumber.from(10).pow(18)),
        amount: '1199999999978000000000',
        satoshis: '5020920502',
        decimals: 18
      }
    ];

    await Promise.all(
      tests.map(async (t) => {
        await collateral.mock.decimals.returns(t.decimals);
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
