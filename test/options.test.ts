import { ethers } from "@nomiclabs/buidler";
import { Signer, Contract, Wallet, ContractFactory } from "ethers";
import chai from "chai";
import { solidity, deployContract, deployMockContract } from "ethereum-waffle";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionFactory } from "../typechain/OptionFactory";
import { BrokerFactory } from "../typechain/BrokerFactory";
import { ErrorCode, Script } from '../lib/constants';
import { Collateral } from "../typechain/Collateral";
import { OptionLibFactory } from "../typechain/OptionLibFactory";
import { OptionLib } from "../typechain/OptionLib";
import { calculatePayouts, deploy, reattach, evmSnapFastForward } from "../lib/contracts";
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json';
import UniswapV2Pair from '@uniswap/v2-core/build/UniswapV2Pair.json';
import { MockBTCReferee } from "../typechain/MockBTCReferee";
import { MockBTCRefereeFactory } from "../typechain/MockBTCRefereeFactory";
import { Option } from "../typechain/Option";
import { Broker } from "../typechain/Broker";
import { ObligationFactory } from "../typechain/ObligationFactory";

chai.use(solidity);
const { expect } = chai;

// async function getBuyableAndSellable(sellableAddress: string, signer: Signer) {
//   let sellableFactory = new ERC20SellableFactory(signer);
//   let sellableContract = sellableFactory.attach(sellableAddress);
//   let buyableAddress = await sellableContract.getBuyable();
//   let buyableFactory = new ERC20BuyableFactory(signer);
//   let buyableContract = buyableFactory.attach(buyableAddress);
//   return {sellableContract, buyableContract};
// }

// async function getCollateral(user: Signer): Promise<Contract> {
//     if ((await ethers.provider.getNetwork()).chainId == 3) {
//       const dai = contracts.ropsten.dai;
//       const collateral = await ethers.getContractAt(legos.erc20.abi, dai);
//       return collateral;
//     } else {
//       let mintableFactory = new CollateralFactory(user);
//       return await mintableFactory.deploy();
//     }
// };

function mount(abi: any, address: string, signer: Signer) {
  return ethers.getContractAt(abi, address, signer);
}

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
  optionFactory: Broker;
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
  const uniswapFactory = await deployContract(<Wallet>signer, UniswapV2Factory, [address]);
  return {
    uniswapFactory: uniswapFactory,
    collateral: await deploy(signer, CollateralFactory),
    optionFactory: await deploy(signer, BrokerFactory, uniswapFactory.address),
    optionLib: await deploy(signer, OptionLibFactory, uniswapFactory.address),
    btcReferee: await deploy(signer, MockBTCRefereeFactory),
  }
}

const mint = async function(collateral: Collateral, signer: Signer, address: string, amount: number) {
  await reattach(collateral, CollateralFactory, signer).mint(address, amount);
  expect((await collateral.balanceOf(address)).toNumber()).to.eq(amount);
};

const approve = async function(collateral: Collateral, signer: Signer, spender: string, amount: number) {
  await reattach(collateral, CollateralFactory, signer).approve(spender, amount);
};

describe('Option (2 Writers, 1 Buyer) - Exercise', () => {
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
  let optionFactory: Broker;
  let optionLib: OptionLib;
  let btcReferee: MockBTCReferee;

  let option: Option;
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
  });

  it("alice should underwrite put options", async () => {
    await mint(collateral, alice, aliceAddress, premiumAmount + collateralAmount);
    await approve(collateral, alice, optionFactory.address, premiumAmount + collateralAmount);

    await reattach(optionFactory, BrokerFactory, alice)
      .writeOption(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);
    const pairAddress: string = await uniswapFactory.getPair(collateral.address, option.address)
    const optionBalance = (await option.balanceOf(pairAddress)).toNumber();
    expect(optionBalance).to.eq(collateralAmount);
  });

  it("eve should underwrite put options", async () => {
    await mint(collateral, eve, eveAddress, premiumAmount + collateralAmount);
    await approve(collateral, eve, optionFactory.address, premiumAmount + collateralAmount);

    await reattach(optionFactory, BrokerFactory, eve)
      .writeOption(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);
    const pairAddress: string = await uniswapFactory.getPair(collateral.address, option.address)
    const optionBalance = (await option.balanceOf(pairAddress)).toNumber();
    expect(optionBalance).to.eq(collateralAmount * 2);
  });

  it("bob should buy put options", async () => {
    // const pair = await mount(UniswapV2Pair.abi, pairAddress, alice)

    await mint(collateral, bob, bobAddress, amountInMax);
    await approve(collateral, bob, optionLib.address, amountInMax);

    await reattach(optionLib, OptionLibFactory, bob)
      .swapTokensForExactTokens(
        option.address,
        amountOut,
        amountInMax,
        collateral.address,
        option.address,
        bobAddress);

    const optionBalance = (await option.balanceOf(bobAddress)).toNumber();
    expect(optionBalance).to.eq(amountOut);
    const collateralBalance = (await collateral.balanceOf(bobAddress)).toNumber();
    expect(collateralBalance).to.eq(1883);

    // bob should owe alice and eve equally
    const obligationAddress = await optionFactory.getPair(option.address);
    const obligation = ObligationFactory.connect(obligationAddress, bob);
    const payouts = await calculatePayouts(obligation, bob, optionBalance)
    expect(payouts.length).to.eq(2);
    expect(payouts[0].writer).to.eq(aliceAddress);
    expect(payouts[0].options.toNumber()).to.eq(amountOut / 2);
    expect(payouts[1].writer).to.eq(eveAddress);
    expect(payouts[1].options.toNumber()).to.eq(amountOut / 2);
  });

  it("bob cannot exercise before expiry", async () => {
    const result = reattach(optionFactory, BrokerFactory, bob)
      .exerciseOption(
        option.address,
        aliceAddress,
        4500,
        0,
        0,
        Buffer.alloc(32, 0),
        Buffer.alloc(32, 0),
        Buffer.alloc(32, 0));
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);
  });

  it("bob should exercise put options after expiry", async () => {
    await evmSnapFastForward(1000, () => {
      return reattach(optionFactory, BrokerFactory, bob)
        .exerciseOption(
          option.address,
          aliceAddress,
          4500,
          0,
          0,
          Buffer.alloc(32, 0),
          Buffer.alloc(32, 0),
          Buffer.alloc(32, 0));
    });
  });
});

describe("Option (1 Writer, 1 Buyer) - Refund", () => {
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
  let optionFactory: Broker;
  let optionLib: OptionLib;
  let btcReferee: MockBTCReferee;

  let option: Option;
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
  });

  it("alice should underwrite put options", async () => {
    await mint(collateral, alice, aliceAddress, premiumAmount + collateralAmount);
    await approve(collateral, alice, optionFactory.address, premiumAmount + collateralAmount);

    await reattach(optionFactory, BrokerFactory, alice)
      .writeOption(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);
    const pairAddress: string = await uniswapFactory.getPair(collateral.address, option.address)
    const optionBalance = (await option.balanceOf(pairAddress)).toNumber();
    expect(optionBalance).to.eq(collateralAmount);
  });

  it("bob should buy put options", async () => {
    await mint(collateral, bob, bobAddress, amountInMax);
    await approve(collateral, bob, optionLib.address, amountInMax);

    await reattach(optionLib, OptionLibFactory, bob)
      .swapTokensForExactTokens(
        option.address,
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
    const obligationAddress = await optionFactory.getPair(option.address);
    const obligation = ObligationFactory.connect(obligationAddress, bob);
    const payouts = await calculatePayouts(obligation, bob, optionBalance)
    expect(payouts.length).to.eq(1);
    expect(payouts[0].writer).to.eq(aliceAddress);
    expect(payouts[0].options.toNumber()).to.eq(amountOut);
  });

  // TODO: alice refunds options
});


  // it("should create, transfer, insure and exercise put option", async () => {
  //   let collateralAmount = 100;
  //   let underlyingAmount = 100;
  //   let premium = 1;
  //   let strikePrice = 1;

  //   let {sellableContract, buyableContract} = await put(collateralAmount, underlyingAmount, premium, strikePrice, getTimeNow() + 1000);

  //   // charlie now becomes the insurer
  //   await call(sellableContract, ERC20SellableFactory, bob).transfer(charlieAddress, collateralAmount);
  //   expect((await sellableContract.balanceOf(bobAddress)).toNumber()).to.eq(0);
  //   expect((await sellableContract.balanceOf(charlieAddress)).toNumber()).to.eq(collateralAmount);

  //   // alice tries to claim options from charlie by paying premium
  //   await call(collateral, CollateralFactory, alice).approve(optionPool.address, premium * underlyingAmount);
  //   let insureCall = call(optionPool, OptionPoolFactory, alice).insureOption(sellableContract.address, charlieAddress, underlyingAmount);
  //   await expect(insureCall).to.be.reverted;

  //   // charlie should set btc payout address
  //   await call(sellableContract, ERC20SellableFactory, charlie).setBtcAddress(btcAddress, Script.p2wpkh);

  //   // alice now can insure
  //   await call(optionPool, OptionPoolFactory, alice).insureOption(sellableContract.address, charlieAddress, underlyingAmount);

  //   // charlie should have premium * amount
  //   expect((await collateral.balanceOf(charlieAddress)).toNumber()).to.eq(premium * underlyingAmount);

  //   // alice has equivalent options
  //   expect((await buyableContract.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

  //   // alice exercises and burns options to redeem collateral
  //   await call(optionPool, OptionPoolFactory, alice).exerciseOption(sellableContract.address, charlieAddress, mockTx.height, mockTx.index, mockTx.txid, mockTx.proof, mockTx.rawtx);
  //   expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(collateralAmount);
  // }).timeout(100000);

  // it("should create, insure, exercise and refund put options", async () => {
  //   let collateralAmount = 300;
  //   let underlyingAmount = 100;
  //   let premium = 2;
  //   let strikePrice = 1;

  //   let now = getTimeNow();
  //   let expiry = now + 1000;

  //   let {sellableContract, buyableContract} = await put(collateralAmount, underlyingAmount, premium, strikePrice, expiry);

  //   // alice now claims option by paying premium
  //   await call(collateral, CollateralFactory, alice).approve(optionPool.address, premium * underlyingAmount);
  //   await call(optionPool, OptionPoolFactory, alice).insureOption(sellableContract.address, bobAddress, underlyingAmount);
  //   expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium * underlyingAmount);

  //   // alice has equivalent options
  //   expect((await buyableContract.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

  //   // alice exercises and burns options to redeem collateral
  //   await call(optionPool, OptionPoolFactory, alice).exerciseOption(sellableContract.address, bobAddress, mockTx.height, mockTx.index, mockTx.txid, mockTx.proof, mockTx.rawtx);
  //   expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

  //   // bob cannot refund his options / authored tokens until after expiry
  //   let bobRefunds = call(optionPool, OptionPoolFactory, bob).refundOption(sellableContract.address);
  //   await expect(bobRefunds).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);

  //   // wait for option to expire
  //   await ethers.provider.send("evm_increaseTime", [50000]);

  //   let bobCollateral = (await collateral.balanceOf(bobAddress)).toNumber();
  //   expect((await sellableContract.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount - (strikePrice * underlyingAmount));
  //   await call(optionPool, OptionPoolFactory, bob).refundOption(sellableContract.address);
  //   expect((await sellableContract.balanceOf(bobAddress)).toNumber()).to.eq(0);
  //   expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(bobCollateral + (collateralAmount - (strikePrice * underlyingAmount)))
  // }).timeout(100000);

  // it("should create, insure and refund put options", async () => {
  //   let collateralAmount = 300;
  //   let underlyingAmount = 100;
  //   let premium = 2;
  //   let strikePrice = 1;

  //   let now = getTimeNow();
  //   let expiry = now + 100000;

  //   let {sellableContract, buyableContract} = await put(collateralAmount, underlyingAmount, premium, strikePrice, expiry);

  //   // alice now claims option by paying premium
  //   await call(collateral, CollateralFactory, alice).approve(optionPool.address, premium * underlyingAmount);
  //   await call(optionPool, OptionPoolFactory, alice).insureOption(sellableContract.address, bobAddress, underlyingAmount);
  //   expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium * underlyingAmount);

  //   // alice has equivalent options
  //   expect((await buyableContract.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

  //   // bob cannot refund his options / authored tokens until after expiry
  //   let bobRefunds = call(optionPool, OptionPoolFactory, bob).refundOption(sellableContract.address);
  //   await expect(bobRefunds).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);

  //   // wait for option to expire
  //   await ethers.provider.send("evm_increaseTime", [50000]);

  //   // alice can no longer exercise her options
  //   let aliceExercises = call(optionPool, OptionPoolFactory, alice).exerciseOption(sellableContract.address, bobAddress, mockTx.height, mockTx.index, mockTx.txid, mockTx.proof, mockTx.rawtx);
  //   await expect(aliceExercises).to.be.revertedWith(ErrorCode.ERR_EXPIRED);

  //   expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium * underlyingAmount);
  //   expect((await sellableContract.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount - (strikePrice * underlyingAmount));
  //   await call(optionPool, OptionPoolFactory, bob).refundOption(sellableContract.address);
  //   expect((await sellableContract.balanceOf(bobAddress)).toNumber()).to.eq(0);
  //   expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount + (premium * underlyingAmount));
  // });

// });
