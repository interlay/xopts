import { ethers } from "@nomiclabs/buidler";
import { Signer, Contract } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionPool } from "../typechain/OptionPool";
import { OptionPoolFactory } from "../typechain/OptionPoolFactory";
import { ERC20BuyableFactory } from "../typechain/ERC20BuyableFactory";
import { ERC20SellableFactory } from "../typechain/ERC20SellableFactory";
import { MockRelayFactory } from "../typechain/MockRelayFactory";
import { MockTxValidatorFactory } from "../typechain/MockTxValidatorFactory";
import { contracts } from "../contracts";
import { legos } from "@studydefi/money-legos";
import { ErrorCode } from './constants';
import { Script } from '../scripts/constants';

chai.use(solidity);
const { expect } = chai;

async function getBuyableAndSellable(sellableAddress: string, signer: Signer) {
  let sellableFactory = new ERC20SellableFactory(signer);
  let sellableContract = sellableFactory.attach(sellableAddress);
  let buyableAddress = await sellableContract.getBuyable();
  let buyableFactory = new ERC20BuyableFactory(signer);
  let buyableContract = buyableFactory.attach(buyableAddress);
  return {sellableContract, buyableContract};
}

interface Callable {
  address: string;
}

interface Attachable<C> {
  attach(addr: string): C;
}

function call<A extends Callable, B extends Attachable<A>>(contract: A, factory: new (from: Signer) => B, signer: Signer): A {
  let _factory = new factory(signer);
  return _factory.attach(contract.address);
}

async function getCollateral(user: Signer): Promise<Contract> {
    if ((await ethers.provider.getNetwork()).chainId == 3) {
      const dai = contracts.ropsten.dai;
      const collateral = await ethers.getContractAt(legos.erc20.abi, dai);
      return collateral;
    } else {
      let mintableFactory = new CollateralFactory(user);
      return await mintableFactory.deploy();
    }
};

function getTimeNow() {
  return Math.round((new Date()).getTime() / 1000);
}

describe("Options", () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;

  let collateral: Contract;
  let optionPool: OptionPool;

  let btcAddress = "0x5587090c3288b46df8cc928c6910a8c1bbea508f";

  let mockTx = {
    height: 0,
    index: 0,
    txid: "0x0000000000000000000000000000000000000000000000000000000000000000",
    proof: "0x00000000000000000000000000000000",
    rawtx: "0x00000000000000000000000000000000",
  }

  beforeEach(async () => {
    let signers = await ethers.signers();
    alice = signers[0];
    bob = signers[1];
    charlie = signers[2];

    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();
    charlieAddress = await charlie.getAddress();

    collateral = await getCollateral(alice);

    let relayFactory = new MockRelayFactory(alice);
    let relay = await relayFactory.deploy();

    let validFactory = new MockTxValidatorFactory(alice);
    let valid = await validFactory.deploy();

    let optionFactory = new OptionPoolFactory(bob);
    optionPool = await optionFactory.deploy(collateral.address, relay.address, valid.address);
  });

  const mint = async function(user: Signer, userAddress: string, collateralAmount: number) {
    if ((await ethers.provider.getNetwork()).chainId == 3) {
      let signer = ethers.provider.getSigner(contracts.ropsten.dai_account);
      let fromDaiAccount = collateral.connect(signer);

      await fromDaiAccount.transfer(userAddress, "100");
    } else {
      await collateral.mint(userAddress, collateralAmount);
    }
    expect((await collateral.balanceOf(userAddress)).toNumber()).to.eq(collateralAmount);
  };

  const put = async function(
    collateralAmount: number,
    underlyingAmount: number,
    premium: number,
    strikePrice: number,
    expiry: number,
  ) {
    // bob needs collateral >= the insured amount
    await mint(bob, bobAddress, collateralAmount);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount);

    // alice needs fees to pay premium
    await mint(alice, aliceAddress, premium * underlyingAmount);
    expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(premium * underlyingAmount);

    await optionPool.createOption(expiry, premium, strikePrice);

    let optionPoolAddress = optionPool.address;
    let optionAddress = (await optionPool.getOptions())[0];
    let {sellableContract, buyableContract} = await getBuyableAndSellable(optionAddress, alice);

    // bob should approve collateral transfer and underwrite
    await call(collateral, CollateralFactory, bob).approve(optionPoolAddress, collateralAmount);
    await call(optionPool, OptionPoolFactory, bob).underwriteOption(optionAddress, collateralAmount, btcAddress, Script.p2wpkh);

    // balances should be adjusted accordingly
    expect((await collateral.balanceOf(await bob.getAddress())).toNumber()).to.eq(0);
    expect((await sellableContract.balanceOf(await bob.getAddress())).toNumber()).to.eq(collateralAmount);

    return {sellableContract, buyableContract};
  };

  it("should fail to create an expired option", async () => {
    let result = optionPool.createOption(getTimeNow(), 0, 0);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it("should fail to create an option with 0 premium", async () => {
    let result = optionPool.createOption(getTimeNow() + 1000, 0, 0);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_ZERO_PREMIUM);
  });

  it("should fail to create an option with 0 strikePrice", async () => {
    let result = optionPool.createOption(getTimeNow() + 1000, 10, 0);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_ZERO_STRIKE_PRICE);
  });

  it("should create, insure and exercise put option", async () => {
    let collateralAmount = 100;
    let underlyingAmount = 100;
    let premium = 1;
    let strikePrice = 1;

    let now = getTimeNow();
    let {sellableContract, buyableContract} = await put(collateralAmount, underlyingAmount, premium, strikePrice, now+1000);

    // alice now claims option by paying premium
    await call(collateral, CollateralFactory, alice).approve(optionPool.address, premium * underlyingAmount);
    await call(optionPool, OptionPoolFactory, alice).insureOption(sellableContract.address, bobAddress, underlyingAmount);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium * underlyingAmount);

    // alice has equivalent options
    expect((await buyableContract.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

    // alice exercises and burns options to redeem collateral
    await call(optionPool, OptionPoolFactory, alice).exerciseOption(sellableContract.address, bobAddress, mockTx.height, mockTx.index, mockTx.txid, mockTx.proof, mockTx.rawtx);
    expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(collateralAmount);
  });

  it("should create, transfer, insure and exercise put option", async () => {
    let collateralAmount = 100;
    let underlyingAmount = 100;
    let premium = 1;
    let strikePrice = 1;

    let {sellableContract, buyableContract} = await put(collateralAmount, underlyingAmount, premium, strikePrice, getTimeNow() + 1000);

    // charlie now becomes the insurer
    await call(sellableContract, ERC20SellableFactory, bob).transfer(charlieAddress, collateralAmount);
    expect((await sellableContract.balanceOf(bobAddress)).toNumber()).to.eq(0);
    expect((await sellableContract.balanceOf(charlieAddress)).toNumber()).to.eq(collateralAmount);

    // alice tries to claim options from charlie by paying premium
    await call(collateral, CollateralFactory, alice).approve(optionPool.address, premium * underlyingAmount);
    let insureCall = call(optionPool, OptionPoolFactory, alice).insureOption(sellableContract.address, charlieAddress, underlyingAmount);
    await expect(insureCall).to.be.reverted;

    // charlie should set btc payout address
    await call(sellableContract, ERC20SellableFactory, charlie).setBtcAddress(btcAddress, Script.p2wpkh);

    // alice now can insure
    await call(optionPool, OptionPoolFactory, alice).insureOption(sellableContract.address, charlieAddress, underlyingAmount);

    // charlie should have premium * amount
    expect((await collateral.balanceOf(charlieAddress)).toNumber()).to.eq(premium * underlyingAmount);

    // alice has equivalent options
    expect((await buyableContract.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

    // alice exercises and burns options to redeem collateral
    await call(optionPool, OptionPoolFactory, alice).exerciseOption(sellableContract.address, charlieAddress, mockTx.height, mockTx.index, mockTx.txid, mockTx.proof, mockTx.rawtx);
    expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(collateralAmount);
  }).timeout(100000);

  it("should create, insure, exercise and refund put options", async () => {
    let collateralAmount = 300;
    let underlyingAmount = 100;
    let premium = 2;
    let strikePrice = 1;

    let now = getTimeNow();
    let expiry = now + 1000;

    let {sellableContract, buyableContract} = await put(collateralAmount, underlyingAmount, premium, strikePrice, expiry);

    // alice now claims option by paying premium
    await call(collateral, CollateralFactory, alice).approve(optionPool.address, premium * underlyingAmount);
    await call(optionPool, OptionPoolFactory, alice).insureOption(sellableContract.address, bobAddress, underlyingAmount);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium * underlyingAmount);

    // alice has equivalent options
    expect((await buyableContract.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

    // alice exercises and burns options to redeem collateral
    await call(optionPool, OptionPoolFactory, alice).exerciseOption(sellableContract.address, bobAddress, mockTx.height, mockTx.index, mockTx.txid, mockTx.proof, mockTx.rawtx);
    expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

    // bob cannot refund his options / authored tokens until after expiry
    let bobRefunds = call(optionPool, OptionPoolFactory, bob).refundOption(sellableContract.address);
    await expect(bobRefunds).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);

    // wait for option to expire
    await ethers.provider.send("evm_increaseTime", [50000]);

    let bobCollateral = (await collateral.balanceOf(bobAddress)).toNumber();
    expect((await sellableContract.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount - (strikePrice * underlyingAmount));
    await call(optionPool, OptionPoolFactory, bob).refundOption(sellableContract.address);
    expect((await sellableContract.balanceOf(bobAddress)).toNumber()).to.eq(0);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(bobCollateral + (collateralAmount - (strikePrice * underlyingAmount)))
  }).timeout(100000);

  it("should create, insure and refund put options", async () => {
    let collateralAmount = 300;
    let underlyingAmount = 100;
    let premium = 2;
    let strikePrice = 1;

    let now = getTimeNow();
    let expiry = now + 100000;

    let {sellableContract, buyableContract} = await put(collateralAmount, underlyingAmount, premium, strikePrice, expiry);

    // alice now claims option by paying premium
    await call(collateral, CollateralFactory, alice).approve(optionPool.address, premium * underlyingAmount);
    await call(optionPool, OptionPoolFactory, alice).insureOption(sellableContract.address, bobAddress, underlyingAmount);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium * underlyingAmount);

    // alice has equivalent options
    expect((await buyableContract.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

    // bob cannot refund his options / authored tokens until after expiry
    let bobRefunds = call(optionPool, OptionPoolFactory, bob).refundOption(sellableContract.address);
    await expect(bobRefunds).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);

    // wait for option to expire
    await ethers.provider.send("evm_increaseTime", [50000]);

    // alice can no longer exercise her options
    let aliceExercises = call(optionPool, OptionPoolFactory, alice).exerciseOption(sellableContract.address, bobAddress, mockTx.height, mockTx.index, mockTx.txid, mockTx.proof, mockTx.rawtx);
    await expect(aliceExercises).to.be.revertedWith(ErrorCode.ERR_EXPIRED);

    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium * underlyingAmount);
    expect((await sellableContract.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount - (strikePrice * underlyingAmount));
    await call(optionPool, OptionPoolFactory, bob).refundOption(sellableContract.address);
    expect((await sellableContract.balanceOf(bobAddress)).toNumber()).to.eq(0);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount + (premium * underlyingAmount));
  });

});
