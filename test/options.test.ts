import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet, Contract } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ERC20 } from "../typechain/ERC20";
import { Collateral } from "../typechain/Collateral";
import { CollateralFactory } from "../typechain/CollateralFactory";
import { OptionPool } from "../typechain/OptionPool";
import { OptionPoolFactory } from "../typechain/OptionPoolFactory";
import { PutOption } from "../typechain/PutOption";
import { PutOptionFactory } from "../typechain/PutOptionFactory";
import { ErrorCode } from './constants';
import config from "../buidler.config";
import contracts from "../contracts";
import { legos } from "@studydefi/money-legos";
import { fromWei } from "./utils";

chai.use(solidity);
const { expect } = chai;

async function getOption(address: string, signer: Signer): Promise<PutOption> {
  const factory = (await ethers.getContract("PutOption")).connect(signer);
  return factory.attach(address) as PutOption;
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

async function mineUntil(expiry: number) {
  let blockNumber = await ethers.provider.getBlockNumber();
  while (blockNumber < expiry) {
    await ethers.provider.send("evm_mine", []);
    blockNumber = await ethers.provider.getBlockNumber();
  }
}

async function getCollateral(alice: Signer): Promise<Contract> {
    if ('fork' in config.networks.ganache) {
      const dai = contracts.dai;
      const collateral =  await ethers.getContractAt(legos.erc20.abi, dai, alice);
      return collateral;
    } else {
      let mintableFactory = new CollateralFactory(alice);
      return await mintableFactory.deploy();
    }
};


describe("Options", () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;

  let collateral: Contract;
  let optionPool: OptionPool;

  let btcAddress = "0x66c7060feb882664ae62ffad0051fe843e318e85";

  beforeEach(async () => {
    let signers = await ethers.signers();
    alice = signers[0];
    bob = signers[1];
    charlie = signers[2];

    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();
    charlieAddress = await charlie.getAddress();

    collateral = await getCollateral(alice);

    let optionFactory = new OptionPoolFactory(bob);
    optionPool = await optionFactory.deploy(collateral.address);
  });

  const mint = async function(user: Signer, userAddress: string, collateralAmount: number) {
    if ('fork' in config.networks.ganache) {
        // get a maker proxy
        const proxyRegistry = await ethers.getContractAt(
            legos.maker.proxyRegistry.abi,
            contracts.proxyRegistry,
            user
        );
        let proxyAddress = await proxyRegistry.proxies(userAddress);
        if (proxyAddress === "0x0000000000000000000000000000000000000000") {
            await proxyRegistry.build({ gasLimit: 1500000 });
            proxyAddress = await proxyRegistry.proxies(userAddress);
        }

        const proxyContract = await ethers.getContractAt(
            legos.dappsys.dsProxy.abi,
            proxyAddress,
            user
        );
        console.log("Proxy contract: ", proxyContract.address);
        const IDssProxyActions = new ethers.utils.Interface(
            legos.maker.dssProxyActions.abi,
        );

        const _data = IDssProxyActions.functions.openLockETHAndDraw.encode([
            contracts.cdpManager,
            contracts.jug,
            contracts.join_eth_A,
            contracts.join_dai,
            ethers.utils.formatBytes32String(legos.maker.ethA.symbol),
            ethers.utils.parseUnits("20", legos.erc20.dai.decimals),
        ]);

        const ethBefore = await ethers.provider.getBalance(userAddress);
        const daiBefore = await collateral.balanceOf(userAddress);
        console.log("ETH balance before: ", ethBefore.toString());
        console.log("Dai balance before: ", daiBefore.toString());

        // Open vault through proxy
        await proxyContract.execute(contracts.dssProxyActions, _data, {
            gasLimit: 2500000,
            value: ethers.utils.parseEther("1"),
        });

        const ethAfter = await ethers.provider.getBalance(userAddress);
        const daiAfter = await collateral.balanceOf(userAddress);
        console.log("ETH balance after: ", ethAfter.toString());
        console.log("Dai balance after: ", daiAfter.toString());

        const ethSpent = parseFloat(fromWei(ethBefore.sub(ethAfter)));
        const daiGained = parseFloat(fromWei(daiAfter.sub(daiBefore)));

        expect(ethSpent).to.be.closeTo(1, 1);
        expect(daiGained).to.be.closeTo(20, 1);
    } else {
        await collateral.mint(userAddress, collateralAmount);
        expect((await collateral.balanceOf(userAddress)).toNumber()).to.eq(collateralAmount);
    }
  };

  const put = async function(
    collateralAmount: number,
    underlyingAmount: number,
    premium: number,
    strikePrice: number,
    expiry: number,
  ) {
    // bob needs collateral >= the insured amount
    console.log("Getting Bob collateral");
    await mint(bob, bobAddress, collateralAmount);
    // await collateral.mint(bobAddress, collateralAmount);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount);

    // alice needs fees to pay premium
    // await collateral.mint(aliceAddress, premium * underlyingAmount);
    console.log("Getting Alice collateral");
    await mint(alice, aliceAddress, premium * underlyingAmount);
    expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(premium * underlyingAmount);

    await optionPool.createOption(expiry, premium, strikePrice);

    let address = (await optionPool.getOptions())[0];
    let option = await getOption(address, alice);

    // bob should approve collateral transfer and underwrite
    await call(collateral, CollateralFactory, bob).approve(address, collateralAmount);
    await call(option, PutOptionFactory, bob).underwrite(collateralAmount, btcAddress);

    await call(option, PutOptionFactory, bob).approve(address, collateralAmount);

    // balances should be adjusted accordingly
    expect((await collateral.balanceOf(await bob.getAddress())).toNumber()).to.eq(0);

    return option;
  };

  it("should fail to create an expired option", async () => {
    let blockNumber = await ethers.provider.getBlockNumber();
    let result = optionPool.createOption(blockNumber - 1, 0, 0);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it("should fail to create an option with 0 premium", async () => {
    let blockNumber = await ethers.provider.getBlockNumber();
    let result = optionPool.createOption(blockNumber + 20, 0, 0);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_ZERO_PREMIUM);
  });

  it("should fail to create an option with 0 strikePrice", async () => {
    let blockNumber = await ethers.provider.getBlockNumber();
    let result = optionPool.createOption(blockNumber + 20, 10, 0);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_ZERO_STRIKE_PRICE);
  });

  it("should create, insure and exercise put option", async () => {
    let collateralAmount = 100;
    let underlyingAmount = 100;
    let premium = 1;
    let strikePrice = 1;

    let option = await put(collateralAmount, underlyingAmount, premium, strikePrice, 20);

    // alice now claims option by paying premium
    await call(collateral, CollateralFactory, alice).approve(option.address, premium * underlyingAmount);
    await call(option, PutOptionFactory, alice).insure(underlyingAmount, bobAddress);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium * underlyingAmount);

    // alice has equivalent options
    expect((await option.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

    // alice exercises and burns options to redeem collateral
    await call(option, PutOptionFactory, alice).exercise();
    expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(collateralAmount);
  }).timeout(100000);

  it("should create, transfer, insure and exercise put option", async () => {
    let collateralAmount = 100;
    let underlyingAmount = 100;
    let premium = 1;
    let strikePrice = 1;

    let option = await put(collateralAmount, underlyingAmount, premium, strikePrice, 40);

    // charlie now becomes the insurer
    await call(option, PutOptionFactory, bob).transfer(charlieAddress, collateralAmount);

    expect((await option.balanceOf(bobAddress)).toNumber()).to.eq(0);
    expect((await option.balanceOf(charlieAddress)).toNumber()).to.eq(collateralAmount);

    // alice claims option by paying premium
    await call(collateral, CollateralFactory, alice).approve(option.address, premium * underlyingAmount);
    let insureCall = call(option, PutOptionFactory, alice).insure(underlyingAmount, charlieAddress);
    await expect(insureCall).to.be.reverted;

    // charlie should set btc payout address
    await call(option, PutOptionFactory, charlie).setBtcAddress(btcAddress);

    // alice now can insure
    await call(option, PutOptionFactory, alice).insure(underlyingAmount, charlieAddress);

    // charlie should have premium * amount
    expect((await collateral.balanceOf(charlieAddress)).toNumber()).to.eq(premium * underlyingAmount);

    // alice has equivalent options
    expect((await option.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

    // alice exercises and burns options to redeem collateral
    await call(option, PutOptionFactory, alice).exercise();
    expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(collateralAmount);
  }).timeout(100000);

  it("should create, insure, exercise and refund put options", async () => {
    let collateralAmount = 300;
    let underlyingAmount = 100;
    let premium = 2;
    let strikePrice = 1;

    let blockNumber = await ethers.provider.getBlockNumber();
    let expiry = blockNumber + 20;

    let option = await put(collateralAmount, underlyingAmount, premium, strikePrice, expiry);

    // alice now claims option by paying premium
    await call(collateral, CollateralFactory, alice).approve(option.address, premium * underlyingAmount);
    await call(option, PutOptionFactory, alice).insure(underlyingAmount, bobAddress);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium * underlyingAmount);

    // alice has equivalent options
    expect((await option.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

    // alice exercises and burns options to redeem collateral
    await call(option, PutOptionFactory, alice).exercise();
    expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

    // bob cannot refund his options / authored tokens until after expiry
    let bobRefunds = call(option, PutOptionFactory, bob).refund();
    await expect(bobRefunds).to.be.revertedWith(ErrorCode.ERR_OPTION_NOT_EXPIRED);

    // wait for option to expire
    await mineUntil(expiry);

    let bobCollateral = (await collateral.balanceOf(bobAddress)).toNumber();
    expect((await option.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount - (strikePrice * underlyingAmount));
    await call(option, PutOptionFactory, bob).refund();
    expect((await option.balanceOf(bobAddress)).toNumber()).to.eq(0);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(bobCollateral + (collateralAmount - (strikePrice * underlyingAmount)))
  }).timeout(100000);

  it("should create, insure and refund put options", async () => {
    let collateralAmount = 300;
    let underlyingAmount = 100;
    let premium = 2;
    let strikePrice = 1;

    let blockNumber = await ethers.provider.getBlockNumber();
    let expiry = blockNumber + 10;

    let option = await put(collateralAmount, underlyingAmount, premium, strikePrice, expiry);

    // alice now claims option by paying premium
    await call(collateral, CollateralFactory, alice).approve(option.address, premium * underlyingAmount);
    await call(option, PutOptionFactory, alice).insure(underlyingAmount, bobAddress);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium * underlyingAmount);

    // alice has equivalent options
    expect((await option.balanceOf(aliceAddress)).toNumber()).to.eq(strikePrice * underlyingAmount);

    // bob cannot refund his options / authored tokens until after expiry
    let bobRefunds = call(option, PutOptionFactory, bob).refund();
    await expect(bobRefunds).to.be.revertedWith(ErrorCode.ERR_OPTION_NOT_EXPIRED);

    // wait for option to expire
    await mineUntil(expiry);

    // alice can no longer exercise her options
    let aliceExercises = call(option, PutOptionFactory, alice).exercise();
    await expect(aliceExercises).to.be.revertedWith(ErrorCode.ERR_OPTION_EXPIRED);

    let bobCollateral = (await collateral.balanceOf(bobAddress)).toNumber();
    expect((await option.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount - (strikePrice * underlyingAmount));
    await call(option, PutOptionFactory, bob).refund();
    expect((await option.balanceOf(bobAddress)).toNumber()).to.eq(0);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(bobCollateral + collateralAmount)
  }).timeout(100000);
});
