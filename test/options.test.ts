import { ethers } from "@nomiclabs/buidler";
import { Signer, Contract, Wallet } from "ethers";
import chai from "chai";
import { solidity, deployContract } from "ethereum-waffle";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionFactory } from "../typechain/OptionFactory";
import { OptionPairFactoryFactory } from "../typechain/OptionPairFactoryFactory";
import { ErrorCode, Script } from '../lib/constants';
import { Collateral } from "../typechain/Collateral";
import { OptionLibFactory } from "../typechain/OptionLibFactory";
import { OptionLib } from "../typechain/OptionLib";
import { calculatePayouts, deploy, reconnect, evmSnapFastForward } from "../lib/contracts";
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json';
import { MockBTCReferee } from "../typechain/MockBTCReferee";
import { MockBTCRefereeFactory } from "../typechain/MockBTCRefereeFactory";
import { Option } from "../typechain/Option";
import { OptionPairFactory } from "../typechain/OptionPairFactory";
import { ObligationFactory } from "../typechain/ObligationFactory";
import { deployUniswapFactory, createUniswapPair } from "../lib/uniswap";
import { IERC20 } from "../typechain/IERC20";
import { IERC20Factory } from "../typechain/IERC20Factory";
import { Obligation } from "../typechain/Obligation";
import { Treasury } from "../typechain/Treasury";
import { TreasuryFactory } from "../typechain/TreasuryFactory";

chai.use(solidity);
const { expect } = chai;

function getTimeNow() {
  return Math.round((new Date()).getTime() / 1000);
}

type Accounts = {
  alice: Signer;
  bob: Signer;
  charlie: Signer;
  eve: Signer;
}

type Contracts = {
  uniswapFactory: Contract;
  collateral: Collateral;
  optionFactory: OptionPairFactory;
  optionLib: OptionLib;
  btcReferee: MockBTCReferee;
}

const btcHash = "0x5587090c3288b46df8cc928c6910a8c1bbea508f";

async function loadAccounts(): Promise<Accounts> {
  const signers = await ethers.signers();
  return {
    alice: signers[0],
    bob: signers[1],
    charlie: signers[2],
    eve: signers[3],
  }
}

async function loadContracts(signer: Signer): Promise<Contracts> {
  // charlie creates everything
  const address = await signer.getAddress();
  const uniswapFactory = await deployUniswapFactory(signer, address);
  return {
    uniswapFactory: uniswapFactory,
    collateral: await deploy(signer, CollateralFactory),
    optionFactory: await deploy(signer, OptionPairFactoryFactory, uniswapFactory.address),
    optionLib: await deploy(signer, OptionLibFactory, uniswapFactory.address),
    btcReferee: await deploy(signer, MockBTCRefereeFactory),
  }
}

const mint = async function(collateral: Collateral, signer: Signer, address: string, amount: number) {
  await reconnect(collateral, CollateralFactory, signer).mint(address, amount);
  expect((await collateral.balanceOf(address)).toNumber()).to.eq(amount);
};

const approve = async function(collateral: IERC20, signer: Signer, spender: string, amount: number) {
  await reconnect(collateral, IERC20Factory, signer).approve(spender, amount);
};

describe('Put Option (2 Writers, 1 Buyer) - Exercise Options', () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;
  let eve: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;
  let eveAddress: string;

  let uniswapFactory: Contract;
  let collateral: Collateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockBTCReferee;
  
  let option: Option;
  let treasury: Treasury;

  const init = getTimeNow();
  const premiumAmount = 200;
  const collateralAmount = 20_000;
  const amountInMax = 2000;
  const amountIn = 117;
  const amountOut = 9000;

  before(async () => {
    const accounts = await loadAccounts();
    ({ alice, bob, eve, charlie } = accounts);
    ({ btcReferee, optionFactory, collateral, uniswapFactory, optionLib } = await loadContracts(charlie));
    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();
    eveAddress = await eve.getAddress();
  });

  it("should fail to create an expired option", async () => {
    const result = optionFactory.createOption(getTimeNow(), 1000, 9000, btcReferee.address, collateral.address);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it("should fail to create an option with 0 strikePrice", async () => {
    const result = optionFactory.createOption(getTimeNow() + 1000, 1000, 0, btcReferee.address, collateral.address);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_ZERO_STRIKE_PRICE);
  });

  it("should create option contract", async () => {
    await optionFactory.createOption(init + 1000, 1000, 9000, btcReferee.address, collateral.address);
    const optionAddress = await optionFactory.options(0);
    option = OptionFactory.connect(optionAddress, alice);
    const treasuryAddress = await optionFactory.getTreasury(collateral.address);
    treasury = TreasuryFactory.connect(treasuryAddress, alice);
  });

  it("alice should underwrite put options", async () => {
    await mint(collateral, alice, aliceAddress, premiumAmount + collateralAmount);
    await approve(collateral, alice, optionFactory.address, premiumAmount + collateralAmount);

    await reconnect(optionFactory, OptionPairFactoryFactory, alice)
      .writeOption(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);
    const pairAddress: string = await uniswapFactory.getPair(collateral.address, option.address)
    const optionBalance = (await option.balanceOf(pairAddress)).toNumber();
    expect(optionBalance).to.eq(collateralAmount);
  });

  it("eve should underwrite put options", async () => {
    await mint(collateral, eve, eveAddress, premiumAmount + collateralAmount);
    await approve(collateral, eve, optionFactory.address, premiumAmount + collateralAmount);

    await reconnect(optionFactory, OptionPairFactoryFactory, eve)
      .writeOption(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);
    const pairAddress: string = await uniswapFactory.getPair(collateral.address, option.address)
    const optionBalance = (await option.balanceOf(pairAddress)).toNumber();
    expect(optionBalance).to.eq(collateralAmount * 2);
  });

  it("bob should buy put options", async () => {
    await mint(collateral, bob, bobAddress, amountInMax);
    await approve(collateral, bob, optionLib.address, amountInMax);

    await reconnect(optionLib, OptionLibFactory, bob)
      .swapTokensForExactTokens(
        amountOut,
        amountInMax,
        collateral.address,
        option.address,
        bobAddress);

    const optionBalance = (await option.balanceOf(bobAddress)).toNumber();
    expect(optionBalance).to.eq(amountOut);
    const collateralBalance = (await collateral.balanceOf(bobAddress)).toNumber();
    expect(collateralBalance).to.eq(amountInMax - amountIn);

    // bob should owe alice and eve equally
    const obligationAddress = await optionFactory.getObligation(option.address);
    const obligation = ObligationFactory.connect(obligationAddress, bob);
    const payouts = await calculatePayouts(obligation, bob, optionBalance)
    expect(payouts.length).to.eq(2);
    expect(payouts[0].writer).to.eq(aliceAddress);
    expect(payouts[0].options.toNumber()).to.eq(amountOut / 2);
    expect(payouts[1].writer).to.eq(eveAddress);
    expect(payouts[1].options.toNumber()).to.eq(amountOut / 2);
  });

  it("bob cannot exercise before expiry", async () => {
    const result = reconnect(optionFactory, OptionPairFactoryFactory, bob)
      .exerciseOption(
        option.address,
        aliceAddress,
        amountOut,
        0,
        0,
        Buffer.alloc(32, 0),
        Buffer.alloc(32, 0),
        Buffer.alloc(32, 0));
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);
  });

  it("bob should exercise options against alice after expiry", async () => {
    await evmSnapFastForward(1000, async () => {
      let result = reconnect(optionFactory, OptionPairFactoryFactory, bob)
        .exerciseOption(
          option.address,
          aliceAddress,
          amountOut,
          0,
          0,
          Buffer.alloc(32, 0),
          Buffer.alloc(32, 0),
          Buffer.alloc(32, 0));
      await expect(result, "payout should be split").to.be.revertedWith(ErrorCode.ERR_INVALID_AMOUNT);

      const aliceAmountOut = amountOut / 2;
      await reconnect(optionFactory, OptionPairFactoryFactory, bob)
        .exerciseOption(
          option.address,
          aliceAddress,
          aliceAmountOut,
          0,
          0,
          Buffer.alloc(32, 0),
          Buffer.alloc(32, 0),
          Buffer.alloc(32, 0));

      const optionBalance = (await option.balanceOf(bobAddress)).toNumber();
      expect(optionBalance, "bob should have no options left").to.eq(aliceAmountOut);
      const collateralBalance = (await collateral.balanceOf(bobAddress)).toNumber();
      expect(collateralBalance, "bob should be credited").to.eq((amountInMax - amountIn) + aliceAmountOut);
  
      const obligationAddress = await optionFactory.getObligation(option.address);
      const obligation = ObligationFactory.connect(obligationAddress, bob);
      const obligationBalance = (await obligation.balanceOf(aliceAddress)).toNumber();
      expect(obligationBalance).to.eq(collateralAmount - aliceAmountOut);
    });
  });
});

describe("Put Option (1 Writer, 1 Buyer) - Refund Obligations", () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;
  let eve: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;
  let eveAddress: string;

  let uniswapFactory: Contract;
  let collateral: Collateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockBTCReferee;

  let option: Option;
  let treasury: Treasury;

  const init = getTimeNow();
  const premiumAmount = 200;
  const collateralAmount = 20_000;
  const amountInMax = 2000;
  const amountOut = 9000;

  before(async () => {
    const accounts = await loadAccounts();
    ({ alice, bob, eve, charlie } = accounts);
    ({ btcReferee, optionFactory, collateral, uniswapFactory, optionLib } = await loadContracts(charlie));
    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();
    eveAddress = await eve.getAddress();
  });

  it("should create option contract", async () => {
    await optionFactory.createOption(init + 1000, 1000, 9000, btcReferee.address, collateral.address);
    const optionAddress = await optionFactory.options(0);
    option = OptionFactory.connect(optionAddress, alice);
    const treasuryAddress = await optionFactory.getTreasury(collateral.address);
    treasury = TreasuryFactory.connect(treasuryAddress, alice);
  });

  it("alice should underwrite put options", async () => {
    await mint(collateral, alice, aliceAddress, premiumAmount + collateralAmount);
    await approve(collateral, alice, optionFactory.address, premiumAmount + collateralAmount);

    await reconnect(optionFactory, OptionPairFactoryFactory, alice)
      .writeOption(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);
    const pairAddress: string = await uniswapFactory.getPair(collateral.address, option.address)
    const optionBalance = (await option.balanceOf(pairAddress)).toNumber();
    expect(optionBalance).to.eq(collateralAmount);
  });

  it("bob should buy put options", async () => {
    await mint(collateral, bob, bobAddress, amountInMax);
    await approve(collateral, bob, optionLib.address, amountInMax);

    await reconnect(optionLib, OptionLibFactory, bob)
      .swapTokensForExactTokens(
        amountOut,
        amountInMax,
        collateral.address,
        option.address,
        bobAddress);

    const optionBalance = (await option.balanceOf(bobAddress)).toNumber();
    expect(optionBalance).to.eq(amountOut);
    const collateralBalance = (await collateral.balanceOf(bobAddress)).toNumber();
    expect(collateralBalance).to.eq(1835);

    // bob should owe alice only
    const obligationAddress = await optionFactory.getObligation(option.address);
    const obligation = ObligationFactory.connect(obligationAddress, bob);
    const payouts = await calculatePayouts(obligation, bob, optionBalance)
    expect(payouts.length).to.eq(1);
    expect(payouts[0].writer).to.eq(aliceAddress);
    expect(payouts[0].options.toNumber()).to.eq(amountOut);
  });

  it("alice should refund options after expiry", async () => {
    const obligationAddress = await optionFactory.getObligation(option.address);
    const obligation = ObligationFactory.connect(obligationAddress, bob);
    const obligationBalance = (await obligation.balanceOf(aliceAddress)).toNumber();
    expect(obligationBalance).to.eq(collateralAmount);
    await evmSnapFastForward(2000, async () => {
      await reconnect(optionFactory, OptionPairFactoryFactory, alice)
        .refundOption(option.address, collateralAmount);
      const obligationBalance = (await obligation.balanceOf(aliceAddress)).toNumber();
      expect(obligationBalance).to.eq(0);
    });
  });
});

describe("Put Option (2 Writers) - Sell / Buy Obligations", () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;
  let eve: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;
  let eveAddress: string;

  let uniswapFactory: Contract;
  let collateral: Collateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockBTCReferee;

  let option: Option;
  let obligation: Obligation;
  let treasury: Treasury;

  const init = getTimeNow();
  const premiumAmount = 340;
  const collateralAmount = 50_000;
  const amountInMax = 2000;
  const amountOut = 3200;

  before(async () => {
    const accounts = await loadAccounts();
    ({ alice, bob, eve, charlie } = accounts);
    ({ btcReferee, optionFactory, collateral, uniswapFactory, optionLib } = await loadContracts(charlie));
    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();
    eveAddress = await eve.getAddress();
  });

  it("should create option contract", async () => {
    await optionFactory.createOption(init + 1000, 1000, 9000, btcReferee.address, collateral.address);
    const optionAddress = await optionFactory.options(0);
    option = OptionFactory.connect(optionAddress, alice);
    const obligationAddress = await optionFactory.getObligation(option.address);
    obligation = ObligationFactory.connect(obligationAddress, alice);
    const treasuryAddress = await optionFactory.getTreasury(collateral.address);
    treasury = TreasuryFactory.connect(treasuryAddress, alice);
  });

  it("alice should underwrite options", async () => {
    await mint(collateral, alice, aliceAddress, premiumAmount + collateralAmount);
    await approve(collateral, alice, optionFactory.address, premiumAmount + collateralAmount);

    await reconnect(optionFactory, OptionPairFactoryFactory, alice)
      .writeOption(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);

    const obligationBalance = (await obligation.balanceOf(aliceAddress)).toNumber();
    expect(obligationBalance).to.eq(collateralAmount);  

    const pairAddress: string = await uniswapFactory.getPair(collateral.address, option.address)
    const optionBalance = (await option.balanceOf(pairAddress)).toNumber();
    expect(optionBalance).to.eq(collateralAmount);
  });

  it("alice should sell obligations", async () => {
    const collateralPremium = 15_000;
    const obligationAmount = 30_000;

    await mint(collateral, alice, aliceAddress, collateralPremium);
    await approve(collateral, alice, optionLib.address, collateralPremium);
    await approve(obligation, alice, optionLib.address, obligationAmount);

    const obligationBalance = (await obligation.balanceOf(aliceAddress)).toNumber();
    console.log(obligationBalance);
    const collateralBalance = (await collateral.balanceOf(aliceAddress)).toNumber();
    console.log(collateralBalance);

    await reconnect(optionLib, OptionLibFactory, alice)
      .initObligationPool(collateral.address, obligation.address, collateralPremium, obligationAmount);
  });

  it("eve can't buy obligations without collateral / btc address", async () => {
    await mint(collateral, eve, eveAddress, amountInMax);
    await approve(collateral, eve, optionLib.address, amountInMax);

    let result = reconnect(optionLib, OptionLibFactory, eve)
      .swapTokensForExactTokens(
        amountOut,
        amountInMax,
        collateral.address,
        obligation.address,
        bobAddress);
    await expect(result).to.be.reverted;
  });

});