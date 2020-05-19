import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet } from "ethers";
import chai from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import CollateralArtifact from "../artifacts/Collateral.json";
import OptionPoolArtifact from "../artifacts/OptionPool.json";
import { Collateral } from "../typechain/Collateral";
import { OptionPool } from "../typechain/OptionPool";
import { PutOption } from "../typechain/PutOption";

chai.use(solidity);
const { expect } = chai;

async function getOption(address: string): Promise<PutOption> {
  const factory = await ethers.getContract("PutOption");
  return factory.attach(address) as PutOption;
}

describe("Options", () => {
  let signers: Signer[];
  let collateral: Collateral;
  let optionPool: OptionPool;

  it("create and exercise put option", async () => {
    signers = await ethers.signers();
    
    let signer = await signers[0].getAddress();
    collateral = await deployContract(<Wallet>signers[0], CollateralArtifact, []) as Collateral;
    let amount = 100;
    await collateral.mint(signer, amount);
    expect((await collateral.balanceOf(signer)).toNumber()).to.eq(amount);
    expect((await collateral.totalSupply()).toNumber()).to.eq(amount);
    
    optionPool = await deployContract(<Wallet>signers[0], OptionPoolArtifact, [collateral.address]) as OptionPool;
    await optionPool.create(20, 1);
    
    let address = await optionPool.options(0);
    await collateral.approve(address, amount);
    let option = await getOption(address);
    await option.underwrite(amount);
    expect((await collateral.balanceOf(signer)).toNumber()).to.eq(0);
    expect((await option.totalSupply()).toNumber()).to.eq(amount);

    await option.exercise(100);
    expect((await collateral.balanceOf(signer)).toNumber()).to.eq(amount);
  });
});
