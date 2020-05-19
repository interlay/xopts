import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { Mintable } from "../typechain/Mintable";
import { MintableFactory } from "../typechain/MintableFactory";
import { OptionPool } from "../typechain/OptionPool";
import { OptionPoolFactory } from "../typechain/OptionPoolFactory";
import { PutOption } from "../typechain/PutOption";
import { PutOptionFactory } from "../typechain/PutOptionFactory";

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

describe("Options", () => {
  let alice: Signer;
  let bob: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let collateral: Mintable;
  let underlying: Mintable;

  let optionPool: OptionPool;

  beforeEach(async () => {
    let signers = await ethers.signers();
    alice = signers[0];
    bob = signers[1];

    aliceAddress = await alice.getAddress()
    bobAddress = await bob.getAddress()

    let mintableFactory = new MintableFactory(alice);
    collateral = await mintableFactory.deploy();
    underlying = await mintableFactory.deploy();

    let optionFactory = new OptionPoolFactory(bob);
    optionPool = await optionFactory.deploy(collateral.address, underlying.address);
  });

  const put = async function(
    collateralAmount: number,
    underlyingAmount: number,
    premium: number,
    strikePrice: number,
  ) {
    // bob needs collateral >= the insured amount
    await collateral.mint(bobAddress, collateralAmount);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(collateralAmount);

    // alice needs fees to pay premium
    await collateral.mint(aliceAddress, premium);
    expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(premium);

    // alice needs to have underlying
    await underlying.mint(aliceAddress, underlyingAmount);
    expect((await underlying.balanceOf(aliceAddress)).toNumber()).to.eq(underlyingAmount);

    await optionPool.create(20, premium, strikePrice);
    
    let address = await optionPool.options(0);
    let option = await getOption(address, alice);

    // alice is not owner, therefore cannot underwrite
    await expect(call(option, PutOptionFactory, alice).underwrite(collateralAmount)).to.be.reverted;

    // bob should approve collateral transfer and underwrite
    await call(collateral, MintableFactory, bob).approve(address, collateralAmount);
    await call(option, PutOptionFactory, bob).underwrite(collateralAmount);

    // balances should be adjusted accordingly
    expect((await collateral.balanceOf(await bob.getAddress())).toNumber()).to.eq(0);
    expect((await option.totalCollateral()).toNumber()).to.eq(collateralAmount);

    return option;
  };

  it("create and exercise put option", async () => {
    let collateralAmount = 100;
    let underlyingAmount = 100;
    let premium = 20;
    let strikePrice = 1;

    let option = await put(collateralAmount, underlyingAmount, premium, strikePrice);

    // alice now claims option by paying premium
    await call(collateral, MintableFactory, alice).approve(option.address, premium);
    await call(option, PutOptionFactory, alice).insure(underlyingAmount);

    expect((await option.totalUnderlying()).toNumber()).to.eq(underlyingAmount);

    await call(option, PutOptionFactory, alice).exercise();

    expect((await collateral.balanceOf(aliceAddress)).toNumber()).to.eq(collateralAmount);
    expect((await collateral.balanceOf(bobAddress)).toNumber()).to.eq(premium);
  });

});
