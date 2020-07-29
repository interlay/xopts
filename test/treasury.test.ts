import chai from "chai";
import { Treasury } from "../typechain/Treasury";
import { ethers } from "@nomiclabs/buidler";
import { Signer } from "ethers";
import { deploy1, deploy0 } from "../lib/contracts";
import { TreasuryFactory } from "../typechain/TreasuryFactory";
import { MockCollateralFactory } from "../typechain/MockCollateralFactory";
import { MockCollateral } from "../typechain/MockCollateral";

const { expect } = chai;

describe("Treasury", () => {
  let signers: Signer[];
  let addresses: string[];

  let collateral: MockCollateral;
  let treasury: Treasury;

  it("should deploy treasury", async () => {
    signers = await ethers.signers();
    addresses = await Promise.all([
      signers[0].getAddress(),
      signers[1].getAddress(),
    ]);

    collateral = await deploy0(signers[0], MockCollateralFactory);
    treasury = await deploy1(signers[0], TreasuryFactory, collateral.address);
  });

  it("should deposit all unreserved funds", async () => {
    const address = addresses[0];
    await collateral.mint(address, 200);
    await collateral.transfer(treasury.address, 200);
    await treasury.deposit(address, address);
    await treasury.lock(address, 200);
    const lockedBalance = (await treasury.balanceOf(address, address)).toNumber();
    expect(lockedBalance).to.eq(200);
  });

  it("should release funds from market", async () => {
    const address0 = addresses[0];
    const address1 = addresses[1];

    await treasury.release(address0, address1, 100);
    const collateralBalance1 = (await collateral.balanceOf(address1)).toNumber();
    expect(collateralBalance1).to.eq(100);
    const lockedBalance0 = (await treasury.balanceOf(address0, address0)).toNumber();
    expect(lockedBalance0).to.eq(100);
  });
});
