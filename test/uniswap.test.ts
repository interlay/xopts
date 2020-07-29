import chai from "chai";
import { estimateInput, estimateOutput } from "../lib/uniswap";
import { BigNumber } from "ethers/utils";

const { expect } = chai;
const promisify = (n: number) => new Promise<BigNumber>((resolve) => resolve(new BigNumber(n)))

describe("Uniswap", () => {
  it("should estimate input correctly", async () => {
    expect((await estimateInput('', { balanceOf: () => promisify(100) }, { balanceOf: () => promisify(100) }, 1)).toNumber()).to.eq(2);
    expect((await estimateInput('', { balanceOf: () => promisify(15000) }, { balanceOf: () => promisify(30000) }, 3200)).toNumber()).to.eq(1797);
    expect((await estimateInput('', { balanceOf: () => promisify(226) }, { balanceOf: () => promisify(60000) }, 3200)).toNumber()).to.eq(13);
  });
  it("should estimate output correctly", async () => {
    expect((await estimateOutput('', { balanceOf: () => promisify(100) }, { balanceOf: () => promisify(100) }, 2)).toNumber()).to.eq(1);
  });
});
