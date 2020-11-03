import chai from 'chai';
import {ethers} from 'hardhat';
import {Signer, constants, BigNumber} from 'ethers';
import {
  deploy0,
  reconnect,
  getEvent,
  getRequestEvent
} from '../../lib/contracts';
import {ObligationFactory} from '../../typechain/ObligationFactory';
import {Obligation} from '../../typechain/Obligation';
import {getTimeNow} from '../common';
import {MockContract, deployMockContract} from 'ethereum-waffle';
import TreasuryArtifact from '../../artifacts/contracts/Treasury.sol/Treasury.json';
import BTCRefereeArtifact from '../../artifacts/contracts/BTCReferee.sol/BTCReferee.json';
import OptionArtifact from '../../artifacts/contracts/Option.sol/Option.json';
import IUniswapV2FactoryArtifact from '../../artifacts/@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol/IUniswapV2Factory.json';
import IERC20Artifact from '../../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json';
import {ErrorCode, Script} from '../../lib/constants';
import {evmSnapFastForward} from '../../lib/mock';
import {newBigNum} from '../../lib/conversion';

const {expect} = chai;

const btcHash = '0x5587090c3288b46df8cc928c6910a8c1bbea508f';

describe('Obligation.sol', () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;

  let obligation: Obligation;
  let option: MockContract;
  let treasury: MockContract;
  let referee: MockContract;
  let uniswapFactory: MockContract;
  let collateral: MockContract;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const strikePrice = newBigNum(9000, 18);
  const amountIn = newBigNum(4500, 18);
  const amountOutSat = BigNumber.from(5000000000); // 0.5 BTC

  beforeEach('should deploy obligation and treasury', async () => {
    [alice, bob, charlie] = await ethers.getSigners();
    [aliceAddress, bobAddress, charlieAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress(),
      charlie.getAddress()
    ]);
    [
      obligation,
      option,
      treasury,
      referee,
      uniswapFactory,
      collateral
    ] = await Promise.all([
      deploy0(alice, ObligationFactory),
      deployMockContract(alice, OptionArtifact.abi),
      deployMockContract(alice, TreasuryArtifact.abi),
      deployMockContract(alice, BTCRefereeArtifact.abi),
      deployMockContract(alice, IUniswapV2FactoryArtifact.abi),
      deployMockContract(alice, IERC20Artifact.abi)
    ]);
    await obligation.initialize(
      18,
      expiryTime,
      windowSize,
      strikePrice,
      option.address,
      referee.address,
      treasury.address,
      uniswapFactory.address
    );
  });

  it('should create with owner', async () => {
    const result = await obligation.owner();
    expect(result).to.eq(aliceAddress);
  });

  it('should fail to initialize as expired', async () => {
    const result = obligation.initialize(
      18,
      getTimeNow(),
      1000,
      9000,
      option.address,
      referee.address,
      treasury.address,
      uniswapFactory.address
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it('should fail to set an empty btc address', async () => {
    const result = obligation.setBtcAddress(constants.AddressZero, Script.p2sh);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NO_BTC_HASH);
  });

  it('should set a btc address', async () => {
    await obligation.setBtcAddress(btcHash, Script.p2sh);
    const result = await obligation.getBtcAddress(aliceAddress);
    expect(result.btcHash).to.eq(btcHash);
    expect(result.format).to.eq(Script.p2sh);
  });

  it('should fail to mint obligations to pool with no btc address', async () => {
    await treasury.mock.lock.returns(constants.AddressZero, Script.p2sh);
    const result = obligation.mintToPool(aliceAddress, 1000);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NO_BTC_HASH);
  });

  it('should fail to mint obligations to writer with no btc address', async () => {
    await treasury.mock.lock.returns(constants.AddressZero, Script.p2sh);
    const result = obligation.mintToWriter(aliceAddress, 1000);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NO_BTC_HASH);
  });

  it('should mint obligations to pool with btc address', async () => {
    await treasury.mock.lock.returns(btcHash, Script.p2sh);
    await treasury.mock.collateral.returns(collateral.address);
    await option.mock.mintToPool.returns();
    const tx = await obligation.mintToPool(aliceAddress, 1000);

    const result = await obligation.getBtcAddress(aliceAddress);
    expect(result.btcHash).to.eq(btcHash);
    expect(result.format).to.eq(Script.p2sh);

    const fragment =
      obligation.interface.events['Transfer(address,address,uint256)'];
    const event = await getEvent(
      fragment,
      [constants.AddressZero, aliceAddress],
      await tx.wait(0),
      obligation
    );
    expect(event.value).to.eq(BigNumber.from(1000));
  });

  it('should mint obligations to writer with btc address', async () => {
    await treasury.mock.lock.returns(btcHash, Script.p2sh);
    await treasury.mock.collateral.returns(collateral.address);
    await option.mock.mintToWriter.returns();
    const tx = await obligation.mintToWriter(aliceAddress, 1000);

    const result = await obligation.getBtcAddress(aliceAddress);
    expect(result.btcHash).to.eq(btcHash);
    expect(result.format).to.eq(Script.p2sh);

    const fragment =
      obligation.interface.events['Transfer(address,address,uint256)'];
    const event = await getEvent(
      fragment,
      [constants.AddressZero, aliceAddress],
      await tx.wait(0),
      obligation
    );
    expect(event.value).to.eq(BigNumber.from(1000));
  });

  it('should fail to request exercise against seller with insufficient balance', async () => {
    await treasury.mock.collateral.returns(collateral.address);
    return evmSnapFastForward(1000, async () => {
      const result = obligation.requestExercise(bobAddress, amountOutSat);
      await expect(result).to.be.revertedWith(
        ErrorCode.ERR_INSUFFICIENT_OBLIGATIONS
      );
    });
  });

  it('should request exercise against seller with sufficient balance', async () => {
    await treasury.mock.lock.returns(btcHash, Script.p2sh);
    await treasury.mock.collateral.returns(collateral.address);
    await option.mock.mintToPool.returns();
    await option.mock.requestExercise.returns();
    await obligation.mintToPool(bobAddress, amountIn);
    const obligationBalance = await obligation.obligations(bobAddress);
    expect(obligationBalance).to.eq(amountIn);

    return evmSnapFastForward(1000, async () => {
      const tx = await obligation.requestExercise(bobAddress, amountOutSat);
      const event = await getRequestEvent(
        obligation,
        aliceAddress,
        bobAddress,
        await tx.wait(0)
      );
      expect(event.amount).to.eq(amountIn);
    });
  });

  it('should not execute exercise without request', async () => {
    await referee.mock.verifyTx.returns(100);

    return evmSnapFastForward(1000, async () => {
      const result = obligation.executeExercise(
        constants.HashZero,
        0,
        0,
        constants.HashZero,
        constants.HashZero,
        constants.HashZero,
        constants.HashZero
      );
      await expect(result).to.be.revertedWith(ErrorCode.ERR_INVALID_REQUEST);
    });
  });

  it('should not execute exercise with invalid output amount / secret', async () => {
    await referee.mock.verifyTx.returns(amountOutSat);
    await treasury.mock.lock.returns(btcHash, Script.p2sh);
    await treasury.mock.collateral.returns(collateral.address);
    await option.mock.mintToPool.returns();
    await option.mock.requestExercise.returns();
    await obligation.mintToPool(bobAddress, amountIn);

    return evmSnapFastForward(1000, async () => {
      const requestTx = await obligation.requestExercise(
        bobAddress,
        amountOutSat
      );
      const requestEvent = await getRequestEvent(
        obligation,
        aliceAddress,
        bobAddress,
        await requestTx.wait(0)
      );
      await referee.mock.verifyTx.returns(amountOutSat.sub(1000));
      const result = obligation.executeExercise(
        requestEvent.id,
        0,
        0,
        constants.HashZero,
        constants.HashZero,
        constants.HashZero,
        constants.HashZero
      );
      await expect(result).to.be.revertedWith(
        ErrorCode.ERR_INVALID_OUTPUT_AMOUNT
      );
    });
  });

  it('should execute exercise with request and sufficient payment', async () => {
    await treasury.mock.lock.returns(btcHash, Script.p2sh);
    await treasury.mock.collateral.returns(collateral.address);
    await treasury.mock.release.returns();
    await option.mock.mintToPool.returns();
    await option.mock.requestExercise.returns();
    await obligation.mintToPool(bobAddress, amountIn);

    return evmSnapFastForward(1000, async () => {
      const requestTx = await obligation.requestExercise(
        bobAddress,
        amountOutSat
      );
      const requestEvent = await getRequestEvent(
        obligation,
        aliceAddress,
        bobAddress,
        await requestTx.wait(0)
      );
      await referee.mock.verifyTx.returns(amountOutSat);
      const tx = await obligation.executeExercise(
        requestEvent.id,
        0,
        0,
        constants.HashZero,
        constants.HashZero,
        constants.HashZero,
        constants.HashZero
      );
      const fragment =
        obligation.interface.events['ExecuteExercise(address,address,uint256)'];
      const event = await getEvent(
        fragment,
        [aliceAddress, bobAddress],
        await tx.wait(0),
        obligation
      );
      expect(event.amount).to.eq(amountIn);
    });
  });

  it('should not set btc address after expiry', async () => {
    return evmSnapFastForward(2000, async () => {
      const result = obligation.setBtcAddress(btcHash, Script.p2pkh);
      await expect(result).to.be.revertedWith(ErrorCode.ERR_EXPIRED);
    });
  });

  it('should sell obligations and withdraw', async () => {
    await treasury.mock.lock.returns(btcHash, Script.p2sh);
    await treasury.mock.collateral.returns(collateral.address);
    await treasury.mock.release.returns();
    await option.mock.mintToPool.returns();
    await obligation.mintToPool(aliceAddress, amountIn);

    // alice sells obligations to bob (pool)
    await obligation.transfer(bobAddress, amountIn);
    const obligationBalanceAlice0 = await obligation.obligations(aliceAddress);
    expect(obligationBalanceAlice0).to.eq(amountIn);
    const poolBalance = await obligation.balanceOf(bobAddress);
    expect(poolBalance).to.eq(amountIn);

    // charlie requires btc address to purchase
    await reconnect(obligation, ObligationFactory, charlie).setBtcAddress(
      btcHash,
      Script.p2sh
    );

    // bob sells obligations to charlie
    await reconnect(obligation, ObligationFactory, bob).transfer(
      charlieAddress,
      amountIn
    );
    const obligationBalanceCharlie = await obligation.obligations(
      charlieAddress
    );
    expect(obligationBalanceCharlie).to.eq(amountIn);

    // alice can now withdraw her collateral
    await obligation.withdraw(amountIn, bobAddress);
    const obligationBalanceAlice1 = await obligation.obligations(aliceAddress);
    expect(obligationBalanceAlice1).to.eq(constants.Zero);
  });

  it('should return details', async () => {
    await treasury.mock.collateral.returns(collateral.address);
    const details = await obligation.getDetails();
    expect(details._strikePrice).to.eq(strikePrice);
    expect(details._windowSize).to.eq(windowSize);
    expect(details._expiryTime).to.eq(expiryTime);
    expect(details._decimals).to.eq(BigNumber.from(18));
    expect(details._collateral).to.eq(collateral.address);
  });
});
