import chai from "chai";
import { ethers } from "@nomiclabs/buidler";
import { Signer, constants } from "ethers";
import { deploy0, createPair } from "../lib/contracts";
import { OptionPairFactoryFactory } from "../typechain/OptionPairFactoryFactory";
import { OptionFactory } from "../typechain/OptionFactory";
import { ObligationFactory } from "../typechain/ObligationFactory";
import { BigNumber, BigNumberish } from "ethers";
import { OptionPairFactory } from "../typechain/OptionPairFactory";

const { expect } = chai;

function getTimeNow() {
  return Math.round((new Date()).getTime() / 1000);
}

type args = {
  strike: BigNumberish,
  amount: BigNumberish,
  satoshis: BigNumberish,
}

describe("Payment", () => {
  let alice: Signer;

  let optionFactory: OptionPairFactory;

  beforeEach("should deploy option factory", async () => {
    [alice] = await ethers.getSigners();
    optionFactory = await deploy0(alice, OptionPairFactoryFactory);
  });

  const deployPair = async (strikePrice: BigNumberish) => {
    const optionAddress = await createPair(optionFactory, getTimeNow() + 1000, 1000, strikePrice, constants.AddressZero, constants.AddressZero);
    const option = OptionFactory.connect(optionAddress, alice);
    const obligationAddress = await optionFactory.getObligation(option.address);
    const obligation = ObligationFactory.connect(obligationAddress, alice);
    return {option, obligation};
  }

  it("should validate amountIn", async () => {
    const tests: args[] = [
      // 9000 strike, 0.5 BTC
      {
        // 18 decimals (e.g. Dai, USDC)
        strike: "9000000000000000000000",
        amount: "4500000000000000000000",
        satoshis: "5000000000",
      },
      {
        // 6 decimals (e.g. USDT)
        strike: "9000000000",
        amount: "4500000000",
        satoshis: "5000000000",
      },
      {
        // 0 decimals
        strike: "9000",
        amount: "4500",
        satoshis: "5000000000",
      },
      // 10000 strike, 0.25 BTC
      {
        // 18 decimals (e.g. Dai, USDC)
        strike: "10000000000000000000000",
        amount: "2500000000000000000000",
        satoshis: "2500000000",
      },
      {
        // 6 decimals (e.g. USDT)
        strike: "10000000000",
        amount: "2500000000",
        satoshis: "2500000000",
      },
      {
        // 0 decimals
        strike: "10000",
        amount: "2500",
        satoshis: "2500000000",
      }
    ];

    await Promise.all(tests.map(async t => {
      const { obligation } = await deployPair(t.strike);
      const result = await obligation.calculateAmountIn(t.satoshis);
      expect(result).to.eq(t.amount);
    }));
  });

  it("should validate amountOut", async () => {
    const tests: args[] = [
      {
        strike: "9000000000000000000000",
        amount: "4500000000000000000000",
        satoshis: 0.5*Math.pow(10, 10),
      },
      {
        strike: "9000000000",
        amount: "4500000000",
        satoshis: 0.5*Math.pow(10, 10),
      },
      {
        strike: BigNumber.from(2390).mul(BigNumber.from(10).pow(18)),
        amount: "1199999999978000000000",
        satoshis: "5020920502",
      }
    ];

    await Promise.all(tests.map(async t => {
      const { obligation } = await deployPair(t.strike);
      const output = await obligation.calculateAmountOut(t.amount);
      expect(output).to.eq(t.satoshis);
    }));
  });
});
