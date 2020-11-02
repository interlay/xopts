import chai from 'chai';
import {ethers} from 'hardhat';
import {Signer, BigNumber, constants} from 'ethers';
import {deploy2, reconnect, deploy1} from '../../lib/contracts';
import {getTimeNow, deployPair} from '../common';
import {Script} from '../../lib/constants';
import {Option} from '../../typechain/Option';
import {
  OptionPairFactoryFactory,
  OptionLibFactory,
  TreasuryFactory
} from '../../typechain';
import {ITetherTokenFactory} from '../../typechain/ITetherTokenFactory';
import {Obligation} from '../../typechain/Obligation';
import {OptionPairFactory} from '../../typechain/OptionPairFactory';
import {newBigNum} from '../../lib/conversion';
import {
  MockContract,
  deployMockContract,
  deployContract
} from 'ethereum-waffle';
import RefereeArtifact from '../../artifacts/contracts/BTCReferee.sol/BTCReferee.json';
import {OptionLib} from '../../typechain/OptionLib';
import {IUniswapV2Factory} from '../../typechain/IUniswapV2Factory';
import TetherTokenArtifact from './static/TetherToken.json';
import {deployUniswapFactory} from '../../lib/uniswap';
import {ITetherToken} from '../../typechain/ITetherToken';
import * as bitcoin from 'bitcoinjs-lib';
import {Treasury} from '../../typechain/Treasury';

const {expect} = chai;

describe('Tether (USDT)', () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let optionFactory: OptionPairFactory;
  let uniswapFactory: IUniswapV2Factory;
  let optionLib: OptionLib;
  let option: Option;
  let obligation: Obligation;
  let treasury: Treasury;
  let referee: MockContract;
  let tether: ITetherToken;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const strikePrice = newBigNum(9000, 6);
  const amountOut = newBigNum(4500, 6);
  const premiumAmount = newBigNum(200, 6);
  const collateralAmount = newBigNum(9000, 6);
  const amountInMax = newBigNum(2000, 6);

  before('should deploy contracts', async () => {
    [alice, bob, charlie] = await ethers.getSigners();
    [aliceAddress, bobAddress] = await Promise.all(
      [alice, bob, charlie].map((acc) => acc.getAddress())
    );

    uniswapFactory = await deployUniswapFactory(alice, aliceAddress);
    [optionFactory, optionLib, referee] = await Promise.all([
      deploy1(alice, OptionPairFactoryFactory, uniswapFactory.address),
      deploy2(
        alice,
        OptionLibFactory,
        uniswapFactory.address,
        constants.AddressZero
      ),
      deployMockContract(alice, RefereeArtifact.abi)
    ]);
  });

  it('should deploy tether (USDT)', async () => {
    // deploy compiled USDT bytecode from mainnet
    // no constructor args required
    const contract = await deployContract(charlie, TetherTokenArtifact, [
      // _initialSupply
      0,
      // _name
      '',
      // _symbol
      '',
      // _decimals
      0
    ]);
    tether = ITetherTokenFactory.connect(contract.address, charlie);
  });

  it('should credit USDT to accounts', async () => {
    const aliceAmount = collateralAmount.add(premiumAmount);
    const bobAmount = amountInMax;
    await tether.issue(BigNumber.from(aliceAmount.add(bobAmount)));
    await tether.transfer(aliceAddress, aliceAmount);
    await tether.transfer(bobAddress, bobAmount);
  });

  it('should create an option pair', async () => {
    ({option, obligation, treasury} = await deployPair(
      optionFactory,
      expiryTime,
      windowSize,
      strikePrice,
      tether.address,
      referee.address,
      alice
    ));

    const decimals = await obligation.decimals();
    expect(decimals).to.eq(6);
  });

  it('should write to an option pair', async () => {
    await reconnect(tether, ITetherTokenFactory, alice).approve(
      optionLib.address,
      collateralAmount.add(premiumAmount)
    );

    const pair = bitcoin.ECPair.makeRandom();
    const p2pkh = bitcoin.payments.p2pkh({pubkey: pair.publicKey});

    await reconnect(treasury, TreasuryFactory, alice).position(
      0,
      constants.MaxUint256,
      expiryTime + windowSize,
      p2pkh.hash!,
      Script.p2pkh
    );

    await reconnect(optionLib, OptionLibFactory, alice).lockAndWriteToPool(
      obligation.address,
      tether.address,
      tether.address,
      collateralAmount,
      premiumAmount,
      collateralAmount,
      premiumAmount
    );

    const pairAddress = await uniswapFactory.getPair(
      tether.address,
      option.address
    );
    const optionBalance = await option.balanceOf(pairAddress);
    expect(optionBalance, 'options should be in pool').to.eq(collateralAmount);
  });

  it('should purchase options from uniswap', async () => {
    await reconnect(tether, ITetherTokenFactory, bob).approve(
      optionLib.address,
      amountInMax
    );

    await reconnect(optionLib, OptionLibFactory, bob).swapTokensForExactTokens(
      amountOut,
      amountInMax,
      [tether.address, option.address],
      bobAddress,
      expiryTime
    );
  });
});
