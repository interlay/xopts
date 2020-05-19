import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet } from "ethers";
import chai from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import Artifact from "../artifacts/Treasury.json";
import { Treasury } from "../typechain/Treasury"

chai.use(solidity);
const { expect } = chai;

describe("Balances", () => {
  let signers: Signer[];
  let treasury: Treasury;

  it("mint 100 flashBTC", async () => {
    signers = await ethers.signers();
    treasury = await deployContract(<Wallet>signers[0], Artifact, []) as Treasury;

    await treasury.mint(100);
    await ethers.provider.send("evm_mine", []);
    expect(await treasury.balanceOf(await signers[0].getAddress())).to.eq(100);
  });
});
