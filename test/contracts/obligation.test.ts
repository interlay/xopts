import chai from "chai";
import { ethers } from "@nomiclabs/buidler";
import { Signer, constants, BigNumber } from "ethers";
import { deploy0, reconnect } from "../../lib/contracts";
import { ObligationFactory } from "../../typechain/ObligationFactory";
import { Obligation } from "../../typechain/Obligation";
import { getTimeNow, getEvent } from "../common";
import { MockContract, deployMockContract } from "ethereum-waffle";
import TreasuryArtifact from '../../artifacts/Treasury.json';
import { ErrorCode, Script } from "../../lib/constants";
import { evmSnapFastForward } from "../../lib/mock";
import { newBigNum } from "../../lib/conversion";

const { expect } = chai;

const btcHash = "0x5587090c3288b46df8cc928c6910a8c1bbea508f";

describe("Obligation.sol", () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;

  let obligation: Obligation;
  let treasury: MockContract;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const strikePrice = newBigNum(9000, 18);
  const amountIn = newBigNum(4500, 18);
  const amountOutSat = BigNumber.from(5000000000); // 0.5 BTC

  beforeEach("should deploy obligation and treasury", async () => {
    [alice, bob, charlie] = await ethers.getSigners();
    [aliceAddress, bobAddress, charlieAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress(),
      charlie.getAddress(),
    ]);
    obligation = await deploy0(alice, ObligationFactory);
    treasury = await deployMockContract(alice, TreasuryArtifact.abi);
    await obligation.initialize(18, expiryTime, windowSize, strikePrice, treasury.address);
  });

  it("should create with owner", async () => {
    const result = await obligation.owner();
    expect(result).to.eq(aliceAddress);
  });

  it("should fail to initialize as expired", async () => {
    const result = obligation.initialize(18, getTimeNow(), 1000, 9000, treasury.address);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it("should fail to set an empty btc address", async () => {
    const result = obligation.setBtcAddress(constants.AddressZero, Script.p2sh);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NO_BTC_ADDRESS);
  });

  it("should set a btc address", async () => {
    await obligation.setBtcAddress(btcHash, Script.p2sh);
    const result = await obligation.getBtcAddress(aliceAddress);
    expect(result.btcHash).to.eq(btcHash);
    expect(result.format).to.eq(Script.p2sh);
  });

  it("should fail to mint obligations with no btc address", async () => {
    const result = obligation.mint(aliceAddress, 1000, constants.AddressZero, Script.p2sh);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NO_BTC_ADDRESS);
  });

  it("should mint obligations with btc address", async () => {
    await treasury.mock.lock.returns();
    const tx = await obligation.mint(aliceAddress, 1000, btcHash, Script.p2sh);

    const result = await obligation.getBtcAddress(aliceAddress);
    expect(result.btcHash).to.eq(btcHash);
    expect(result.format).to.eq(Script.p2sh);

    const fragment = obligation.interface.events["Transfer(address,address,uint256)"];
    const event = await getEvent(fragment, [constants.AddressZero, aliceAddress], tx, obligation);
    expect(event.value).to.eq(BigNumber.from(1000));
  });

  it("should fail to request exercise against seller with insufficient balance", async () => {
    return evmSnapFastForward(1000, async () => {
      const result = obligation.requestExercise(aliceAddress, bobAddress, amountOutSat);
      await expect(result).to.be.revertedWith(ErrorCode.ERR_INSUFFICIENT_OBLIGATIONS);
    });
  });

  it("should request exercise against seller with sufficient balance", async () => {
    await treasury.mock.lock.returns();
    await obligation.mint(bobAddress, amountIn, btcHash, Script.p2sh);
    const obligationBalance = await obligation.balanceObl(bobAddress);
    expect(obligationBalance).to.eq(amountIn);

    return evmSnapFastForward(1000, async () => {
      const tx = await obligation.requestExercise(aliceAddress, bobAddress, amountOutSat);
      const fragment = obligation.interface.events["RequestExercise(address,address,uint256,uint256)"];
      const event = await getEvent(fragment, [aliceAddress, bobAddress], tx, obligation);
      expect(event.amount).to.eq(amountIn); 
    });
  });

  it("should not execute exercise without request", async () => {
    return evmSnapFastForward(1000, async () => {
      const result = obligation.executeExercise(aliceAddress, bobAddress, amountOutSat);
      await expect(result).to.be.revertedWith(ErrorCode.ERR_INVALID_REQUEST);
    });
  });

  it("should not execute exercise with invalid output amount / secret", async () => {
    await treasury.mock.lock.returns();
    await obligation.mint(bobAddress, amountIn, btcHash, Script.p2sh);

    return evmSnapFastForward(1000, async () => {
      await obligation.requestExercise(aliceAddress, bobAddress, amountOutSat);
      const result = obligation.executeExercise(aliceAddress, bobAddress, amountOutSat);
      await expect(result).to.be.revertedWith(ErrorCode.ERR_INVALID_OUTPUT_AMOUNT);
    });
  });

  it("should execute exercise with request and sufficient payment", async () => {
    await treasury.mock.lock.returns();
    await treasury.mock.release.returns();
    await obligation.mint(bobAddress, amountIn, btcHash, Script.p2sh);

    return evmSnapFastForward(1000, async () => {
      await obligation.requestExercise(aliceAddress, bobAddress, amountOutSat);
      const secret = await obligation.getSecret(bobAddress);
      const tx = await obligation.executeExercise(aliceAddress, bobAddress, amountOutSat.add(secret));
      const fragment = obligation.interface.events["ExecuteExercise(address,address,uint256,uint256)"];
      const event = await getEvent(fragment, [aliceAddress, bobAddress], tx, obligation);
      expect(event.amount).to.eq(amountIn); 
    });
  });

  it("should not refund before expiry", async () => {
    const result = obligation.refund(bobAddress, 0);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);
  });

  it("should not refund during window", async () => {
    return evmSnapFastForward(1000, async () => {
      const result = obligation.refund(bobAddress, 0);
      await expect(result).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);
    });
  });

  it("should not refund after window with insufficient balance", async () => {
    await treasury.mock.release.returns();

    return evmSnapFastForward(2000, async () => {
      const result = obligation.refund(bobAddress, amountIn);
      await expect(result).to.be.revertedWith(ErrorCode.ERR_TRANSFER_EXCEEDS_BALANCE);
    });
  });

  it("should refund after window", async () => {
    await treasury.mock.lock.returns();
    await treasury.mock.release.returns();
    await obligation.mint(bobAddress, amountIn, btcHash, Script.p2sh);

    return evmSnapFastForward(2000, async () => {
      await obligation.refund(bobAddress, amountIn);
      const obligationBalance = await obligation.balanceObl(bobAddress);
      expect(obligationBalance).to.eq(constants.Zero);
    });
  });

  it("should sell obligations and withdraw", async () => {
    await treasury.mock.lock.returns();
    await treasury.mock.release.returns();
    await obligation.mint(aliceAddress, amountIn, btcHash, Script.p2sh);

    // alice sells obligations to bob (pool)
    await obligation.transfer(bobAddress, amountIn);
    const obligationBalanceAlice0 = await obligation.balanceObl(aliceAddress);
    expect(obligationBalanceAlice0).to.eq(amountIn);
    const poolBalance = await obligation.balanceOf(bobAddress);
    expect(poolBalance).to.eq(amountIn);

    // charlie requires btc address to purchase
    await reconnect(obligation, ObligationFactory, charlie)
      .setBtcAddress(btcHash, Script.p2sh);
    
    // bob sells obligations to charlie
    await reconnect(obligation, ObligationFactory, bob)
      .transfer(charlieAddress, amountIn);
    const obligationBalanceCharlie = await obligation.balanceObl(charlieAddress);
    expect(obligationBalanceCharlie).to.eq(amountIn);

    // alice can now withdraw her collateral
    await obligation.withdraw(amountIn, bobAddress);
    const obligationBalanceAlice1 = await obligation.balanceObl(aliceAddress);
    expect(obligationBalanceAlice1).to.eq(constants.Zero);
  });
});
