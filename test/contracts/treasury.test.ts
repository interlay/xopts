import chai from 'chai';
import {Treasury} from '../../typechain/Treasury';
import {ethers} from 'hardhat';
import {Signer, constants} from 'ethers';
import {deploy2, reconnect} from '../../lib/contracts';
import {TreasuryFactory} from '../../typechain/TreasuryFactory';
import ERC20Artifact from '../../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json';
import ObligationArtifact from '../../artifacts/contracts/Obligation.sol/Obligation.json';
import * as bitcoin from 'bitcoinjs-lib';
import {MockContract, deployMockContract} from '@gregdhill/mock-contract';
import {ErrorCode, Script} from '../../lib/constants';
import {getTimeNow} from '../common';

const {expect} = chai;

describe('Treasury.sol', () => {
  let alice: Signer;
  let bob: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let collateral: MockContract;
  let obligation: MockContract;
  let treasury: Treasury;

  beforeEach('should deploy treasury', async () => {
    [alice, bob] = await ethers.getSigners();
    [aliceAddress, bobAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress()
    ]);
    [collateral, obligation] = await Promise.all([
      deployMockContract(alice, ERC20Artifact.abi),
      deployMockContract(alice, ObligationArtifact.abi)
    ]);
    treasury = await deploy2(
      alice,
      TreasuryFactory,
      collateral.address,
      aliceAddress
    );
    await treasury.authorize(obligation.address);
  });

  it('should fail to deposit funds if position is not set', async () => {
    await collateral.mock.balanceOf.returns(200);
    const result = treasury.deposit(aliceAddress);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_POSITION_NOT_SET);
  });

  const makeKeyPair = () => {
    const pair = bitcoin.ECPair.makeRandom();
    const p2pkh = bitcoin.payments.p2pkh({pubkey: pair.publicKey});
    return p2pkh;
  };

  const deposit = async (
    balance: number,
    now: number,
    positionWindow: number,
    optionWindow: number,
    strikePrice: number
  ) => {
    await reconnect(treasury, TreasuryFactory, alice).position(
      0,
      constants.MaxUint256,
      now + positionWindow,
      makeKeyPair().hash!,
      Script.p2pkh
    );

    await collateral.mock.balanceOf.returns(balance);
    await treasury.deposit(aliceAddress);
    await obligation.mock.getDetails.returns(
      now,
      optionWindow,
      strikePrice,
      0,
      collateral.address,
      constants.AddressZero
    );
    await obligation.call(
      treasury,
      'lock(address,uint256)',
      aliceAddress,
      balance
    );
    const lockedBalance = await treasury.lockedIn(
      obligation.address,
      aliceAddress
    );
    expect(lockedBalance.toNumber()).to.eq(balance);
  };

  it('should not set invalid position', async () => {
    const pastExpiry = reconnect(treasury, TreasuryFactory, alice).position(
      0,
      constants.MaxUint256,
      0,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      makeKeyPair().hash!,
      Script.p2pkh
    );
    await expect(pastExpiry).to.be.revertedWith(
      ErrorCode.ERR_POSITION_INVALID_EXPIRY
    );

    const negativeRange = reconnect(treasury, TreasuryFactory, alice).position(
      1,
      0,
      constants.MaxUint256,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      makeKeyPair().hash!,
      Script.p2pkh
    );
    await expect(negativeRange).to.be.revertedWith(
      ErrorCode.ERR_POSITION_STRIKE_RANGE_INVALID
    );
  });

  it('should not deposit without position', async () => {
    const aliceBalance = 200;
    await collateral.mock.balanceOf.returns(aliceBalance);
    const result = treasury.deposit(aliceAddress);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_POSITION_NOT_SET);
  });

  it('should deposit all unreserved funds', async () => {
    const aliceBalance = 200;
    const now = getTimeNow();
    const positionWindow = 1000;
    const optionWindow = 100;
    const strikePrice = 50;

    await deposit(aliceBalance, now, positionWindow, optionWindow, strikePrice);
  });

  it('should not unlock reserved funds before expiry', async () => {
    const aliceBalance = 340;
    const now = getTimeNow();
    const positionWindow = 1000;
    const optionWindow = 100;
    const strikePrice = 18;

    await deposit(aliceBalance, now, positionWindow, optionWindow, strikePrice);

    await obligation.mock.canExit.returns(false);
    const result = treasury.unlock(
      obligation.address,
      aliceAddress,
      aliceBalance
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_MARKET_NOT_EXPIRED);
  });

  it('should unlock all reserved funds after expiry', async () => {
    const aliceBalance = 340;
    const now = getTimeNow();
    const positionWindow = 1000;
    const optionWindow = 100;
    const strikePrice = 18;

    await deposit(aliceBalance, now, positionWindow, optionWindow, strikePrice);

    await obligation.mock.canExit.returns(true);
    // anyone can unlock funds as long as option has expired
    await treasury.unlock(obligation.address, aliceAddress, aliceBalance);

    const lockedBalanceAfter = await treasury.lockedIn(
      obligation.address,
      aliceAddress
    );
    expect(lockedBalanceAfter.toNumber()).to.eq(0);
  });

  it('should release funds from market', async () => {
    const aliceBalance = 5236;
    const now = getTimeNow();
    const positionWindow = 567;
    const optionWindow = 400;
    const strikePrice = 87;

    await deposit(aliceBalance, now, positionWindow, optionWindow, strikePrice);

    await collateral.mock.transfer.returns(true);
    await obligation.call(
      treasury,
      'release(address,address,uint256)',
      aliceAddress,
      bobAddress,
      aliceBalance
    );

    const lockedBalance = await treasury.lockedIn(
      obligation.address,
      aliceAddress
    );
    expect(lockedBalance.toNumber()).to.eq(0);
  });
});

// TODO: test position expired
// TODO: test invalid unlock (params)
