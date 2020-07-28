import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet } from "ethers";
import chai from "chai";
import { solidity, deployMockContract, MockContract } from "ethereum-waffle";
import { MockCollateralFactory } from "../typechain/MockCollateralFactory";
import { OptionFactory } from "../typechain/OptionFactory";
import { OptionPairFactoryFactory } from "../typechain/OptionPairFactoryFactory";
import { ErrorCode, Script } from '../lib/constants';
import { MockCollateral } from "../typechain/MockCollateral";
import { OptionLibFactory } from "../typechain/OptionLibFactory";
import { OptionLib } from "../typechain/OptionLib";
import { deploy0, reconnect, evmSnapFastForward } from "../lib/contracts";
import { Option } from "../typechain/Option";
import { OptionPairFactory } from "../typechain/OptionPairFactory";
import { ObligationFactory } from "../typechain/ObligationFactory";
import { deployUniswapFactory, createUniswapPair, estimateInput, getUniswapPair } from "../lib/uniswap";
import { IERC20 } from "../typechain/IERC20";
import { IERC20Factory } from "../typechain/IERC20Factory";
import { Obligation } from "../typechain/Obligation";
import { Treasury } from "../typechain/Treasury";
import { TreasuryFactory } from "../typechain/TreasuryFactory";
import { IUniswapV2Factory } from "../typechain/IUniswapV2Factory";
import BTCRefereeArtifact from "../artifacts/BTCReferee.json";

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
  uniswapFactory: IUniswapV2Factory;
  collateral: MockCollateral;
  optionFactory: OptionPairFactory;
  optionLib: OptionLib;
  btcReferee: MockContract;
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
  const uniswapFactory = await deployUniswapFactory(signer, address) as IUniswapV2Factory;
  const optionPairFactory = await deploy0(signer, OptionPairFactoryFactory);
  const optionLibFactory = new OptionLibFactory(signer);
  const optionLib = await optionLibFactory.deploy(uniswapFactory.address);

  return {
    uniswapFactory: uniswapFactory,
    collateral: await deploy0(signer, MockCollateralFactory),
    optionFactory: optionPairFactory,
    optionLib: optionLib,
    btcReferee: await deployMockContract(<Wallet>signer, BTCRefereeArtifact.abi),
  }
}

const mint = async function(collateral: MockCollateral, signer: Signer, address: string, amount: number) {
  await reconnect(collateral, MockCollateralFactory, signer).mint(address, amount);
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

  let uniswapFactory: IUniswapV2Factory;
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;
  
  let option: Option;
  let obligation: Obligation;
  let treasury: Treasury;

  const init = getTimeNow();
  const strikePrice = 50;
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
    const result = optionFactory.createPair(getTimeNow(), 1000, 9000, collateral.address, btcReferee.address);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it("should fail to create an option with 0 strikePrice", async () => {
    const result = optionFactory.createPair(getTimeNow() + 1000, 1000, 0, collateral.address, btcReferee.address);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_ZERO_STRIKE_PRICE);
  });

  it("should create option contract", async () => {
    await optionFactory.createPair(init + 1000, 1000, strikePrice, collateral.address, btcReferee.address);
    const optionAddress = await optionFactory.options(0);
    option = OptionFactory.connect(optionAddress, alice);

    const obligationAddress = await optionFactory.getObligation(option.address);
    obligation = ObligationFactory.connect(obligationAddress, alice);

    const treasuryAddress = await optionFactory.getTreasury(collateral.address);
    treasury = TreasuryFactory.connect(treasuryAddress, alice);
  });

  it("alice should underwrite put options", async () => {
    await mint(collateral, alice, aliceAddress, premiumAmount + collateralAmount);
    await approve(collateral, alice, optionLib.address, premiumAmount + collateralAmount);

    await reconnect(optionLib, OptionLibFactory, alice)
      .lockAndWrite(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);
    const pairAddress = await uniswapFactory.getPair(collateral.address, option.address)
    const optionBalance = (await option.balanceOf(pairAddress)).toNumber();
    expect(optionBalance).to.eq(collateralAmount);
  });

  it("eve should underwrite put options", async () => {
    await mint(collateral, eve, eveAddress, premiumAmount + collateralAmount);
    await approve(collateral, eve, optionLib.address, premiumAmount + collateralAmount);

    await reconnect(optionLib, OptionLibFactory, eve)
      .lockAndWrite(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);
    const pairAddress = await uniswapFactory.getPair(collateral.address, option.address)
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
        option.address);

    const optionBalance = (await option.balanceOf(bobAddress)).toNumber();
    expect(optionBalance).to.eq(amountOut);
    const collateralBalance = (await collateral.balanceOf(bobAddress)).toNumber();
    expect(collateralBalance).to.eq(amountInMax - amountIn);
  });

  it("bob cannot exercise before expiry", async () => {
    const result = reconnect(option, OptionFactory, bob)
      .requestExercise(
        aliceAddress,
        amountOut);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);
  });

  it("bob should exercise options against alice after expiry", async () => {
    await evmSnapFastForward(1000, async () => {
      await reconnect(option, OptionFactory, bob)
        .requestExercise(
          aliceAddress,
          amountOut);

      const secret = (await obligation.getSecret(bobAddress, aliceAddress)).toNumber();
      await btcReferee.mock.verifyTx.returns((amountOut / strikePrice) + secret);

      await reconnect(option, OptionFactory, bob)
        .executeExercise(
          aliceAddress,
          0,
          0,
          Buffer.alloc(32, 0),
          Buffer.alloc(32, 0),
          Buffer.alloc(32, 0));

      const optionBalance = (await option.balanceOf(bobAddress)).toNumber();
      expect(optionBalance, "bob should have no options left").to.eq(0);

      const collateralBalance = (await collateral.balanceOf(bobAddress)).toNumber();
      expect(collateralBalance, "bob should be credited").to.eq((amountInMax - amountIn) + amountOut);
  
      const obligationBalance = (await obligation.balanceObl(aliceAddress)).toNumber();
      expect(obligationBalance).to.eq(collateralAmount - amountOut);
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

  let uniswapFactory: IUniswapV2Factory;
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;

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
    await optionFactory.createPair(init + 1000, 1000, 9000, collateral.address, btcReferee.address);
    const optionAddress = await optionFactory.options(0);
    option = OptionFactory.connect(optionAddress, alice);
    const treasuryAddress = await optionFactory.getTreasury(collateral.address);
    treasury = TreasuryFactory.connect(treasuryAddress, alice);
  });

  it("alice should underwrite put options", async () => {
    await mint(collateral, alice, aliceAddress, premiumAmount + collateralAmount);
    await approve(collateral, alice, optionLib.address, premiumAmount + collateralAmount);

    await reconnect(optionLib, OptionLibFactory, alice)
      .lockAndWrite(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);
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
        option.address);

    const optionBalance = (await option.balanceOf(bobAddress)).toNumber();
    expect(optionBalance).to.eq(amountOut);
    const collateralBalance = (await collateral.balanceOf(bobAddress)).toNumber();
    expect(collateralBalance).to.eq(1835);
  });

  it("alice should refund options after expiry", async () => {
    const obligationAddress = await optionFactory.getObligation(option.address);
    const obligation = ObligationFactory.connect(obligationAddress, bob);
    const obligationBalance = (await obligation.balanceOf(aliceAddress)).toNumber();
    expect(obligationBalance).to.eq(collateralAmount);
    await evmSnapFastForward(2000, async () => {
      await reconnect(option, OptionFactory, alice).refund(collateralAmount);
      const obligationBalance = (await obligation.balanceObl(aliceAddress)).toNumber();
      expect(obligationBalance).to.eq(0);
    });
  });
});

describe("Put Option (1 Writer, 1 Buyer) - Transfer Obligations", () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;
  let eve: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;
  let eveAddress: string;

  let uniswapFactory: IUniswapV2Factory;
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;

  let option: Option;
  let obligation: Obligation;
  let treasury: Treasury;

  const init = getTimeNow();
  const premiumAmount = 340;
  const collateralAmount = 50_000;
  const amountInMax = 2000;
  const amountOut = 3200;
  const collateralPremium = 15_000;
  const obligationAmount = 30_000;

  before(async () => {
    const accounts = await loadAccounts();
    ({ alice, bob, eve, charlie } = accounts);
    ({ btcReferee, optionFactory, collateral, uniswapFactory, optionLib } = await loadContracts(charlie));
    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();
    eveAddress = await eve.getAddress();
  });

  it("should create option contract", async () => {
    await optionFactory.createPair(init + 1000, 1000, 9000, collateral.address, btcReferee.address);
    const optionAddress = await optionFactory.options(0);
    option = OptionFactory.connect(optionAddress, alice);
    const obligationAddress = await optionFactory.getObligation(option.address);
    obligation = ObligationFactory.connect(obligationAddress, alice);
    const treasuryAddress = await optionFactory.getTreasury(collateral.address);
    treasury = TreasuryFactory.connect(treasuryAddress, alice);
  });

  it("alice should underwrite options", async () => {
    await mint(collateral, alice, aliceAddress, premiumAmount + collateralAmount);
    await approve(collateral, alice, optionLib.address, premiumAmount + collateralAmount);

    await reconnect(optionLib, OptionLibFactory, alice)
      .lockAndWrite(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);

    const obligationBalance = (await obligation.balanceOf(aliceAddress)).toNumber();
    expect(obligationBalance).to.eq(collateralAmount);  

    const pairAddress: string = await uniswapFactory.getPair(collateral.address, option.address)
    const optionBalance = (await option.balanceOf(pairAddress)).toNumber();
    expect(optionBalance).to.eq(collateralAmount);
  });

  it("alice should sell obligations", async () => {
    await mint(collateral, alice, aliceAddress, collateralPremium);
    await approve(collateral, alice, optionLib.address, collateralPremium);
    await approve(obligation, alice, optionLib.address, obligationAmount);

    await reconnect(optionLib, OptionLibFactory, alice)
      .addLiquidity(collateral.address, obligation.address, collateralPremium, obligationAmount, collateralPremium, obligationAmount);

    const obligationBalance = (await obligation.balanceOf(aliceAddress)).toNumber();
    expect(obligationBalance).to.eq(collateralAmount - obligationAmount);
    const collateralBalance = (await collateral.balanceOf(aliceAddress)).toNumber();
    expect(collateralBalance).to.eq(0);
  });

  it("eve can't buy obligations without collateral / btc address", async () => {
    let result = reconnect(optionLib, OptionLibFactory, eve)
      .swapTokensForExactTokens(
        amountOut,
        amountInMax,
        collateral.address,
        obligation.address);
    await expect(result).to.be.reverted;
  });

  it("eve should set btc address and buy obligations", async () => {
    const aliceCollateral0 = (await collateral.balanceOf(aliceAddress)).toNumber();

    await mint(collateral, eve, eveAddress, amountInMax + amountOut);
    await approve(collateral, eve, optionLib.address, amountInMax + amountOut);

    const pairAddress = await uniswapFactory.getPair(collateral.address, obligation.address)
    const input = await estimateInput(pairAddress, collateral, obligation, amountOut);
    const estimatedInput = input.toNumber();

    await reconnect(obligation, ObligationFactory, eve).setBtcAddress(btcHash, Script.p2sh);
    await reconnect(optionLib, OptionLibFactory, eve)
      .lockAndBuy(
        obligation.address,
        amountOut,
        amountInMax);

        
    const obligationBalance = (await obligation.balanceObl(eveAddress)).toNumber();
    expect(obligationBalance).to.eq(amountOut);
    const collateralBalance = (await collateral.balanceOf(eveAddress)).toNumber();
    expect(collateralBalance).to.eq(amountInMax - estimatedInput);

    // TODO: alice should withdraw
    // const aliceCollateral1 = (await collateral.balanceOf(aliceAddress)).toNumber();
    // expect(aliceCollateral1).to.eq(aliceCollateral0 + amountOut);
  });
});

describe("Put Option (2 Writers, 1 Buyer) - Transfer Obligations", () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;
  let eve: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;
  let eveAddress: string;

  let uniswapFactory: IUniswapV2Factory;
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;

  let option: Option;
  let obligation: Obligation;
  let treasury: Treasury;

  const init = getTimeNow();
  const premiumAmount = 543;
  const collateralAmount = 43_100;
  const amountInMax = 2000;
  const amountOut = 3200;
  const collateralPremium = 113;
  const obligationAmount = 30_000;

  before(async () => {
    const accounts = await loadAccounts();
    ({ alice, bob, eve, charlie } = accounts);
    ({ btcReferee, optionFactory, collateral, uniswapFactory, optionLib } = await loadContracts(charlie));
    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();
    eveAddress = await eve.getAddress();
  });

  it("should create option contract", async () => {
    await optionFactory.createPair(init + 1000, 1000, 9000, collateral.address, btcReferee.address);
    const optionAddress = await optionFactory.options(0);
    option = OptionFactory.connect(optionAddress, alice);

    const obligationAddress = await optionFactory.getObligation(option.address);
    obligation = ObligationFactory.connect(obligationAddress, alice);

    const treasuryAddress = await optionFactory.getTreasury(collateral.address);
    treasury = TreasuryFactory.connect(treasuryAddress, alice);
  });

  it("alice and eve should underwrite options", async () => {
    const pairAddress = await uniswapFactory.getPair(collateral.address, option.address);

    const underwrite = async (signer: Signer, address: string) => {
      await mint(collateral, signer, address, premiumAmount + collateralAmount);
      await approve(collateral, signer, optionLib.address, premiumAmount + collateralAmount);
  
      // const initialOptionBalance = (await option.balanceOf(pairAddress)).toNumber();

      await reconnect(optionLib, OptionLibFactory, signer)
        .lockAndWrite(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);
  
      const obligationBalance = (await obligation.balanceObl(address)).toNumber();
      expect(obligationBalance).to.eq(collateralAmount);
      
      // const optionBalance = (await option.balanceOf(pairAddress)).toNumber();
      // expect(optionBalance).to.eq(initialOptionBalance + collateralAmount);  
    };

    await underwrite(alice, aliceAddress);
    await underwrite(eve, eveAddress);
  });

  it("alice and eve should sell obligations", async () => {
    await uniswapFactory.createPair(collateral.address, obligation.address);
    const pairAddress = await uniswapFactory.getPair(collateral.address, obligation.address);

    const addLiquidity = async (signer: Signer, address: string) => {
      await mint(collateral, signer, address, collateralPremium);
      await approve(collateral, signer, optionLib.address, collateralPremium);
      await approve(obligation, signer, optionLib.address, obligationAmount);
  
      const obligationBalance0 = (await obligation.balanceOf(pairAddress)).toNumber();

      await reconnect(optionLib, OptionLibFactory, signer)
        .addLiquidity(collateral.address, obligation.address, collateralPremium, obligationAmount, collateralPremium, obligationAmount);

      const obligationBalance1 = (await obligation.balanceOf(pairAddress)).toNumber();
      expect(obligationBalance1).to.eq(obligationBalance0 + obligationAmount);  
    };

    await addLiquidity(alice, aliceAddress);
    await addLiquidity(eve, eveAddress);
  });

  it("bob should buy obligations from the pool", async () => {
    const aliceCollateral0 = (await collateral.balanceOf(aliceAddress)).toNumber();
    const eveCollateral0 = (await collateral.balanceOf(eveAddress)).toNumber();

    await mint(collateral, bob, bobAddress, amountInMax + amountOut);
    await approve(collateral, bob, optionLib.address, amountInMax + amountOut);

    const pairAddress = await uniswapFactory.getPair(collateral.address, obligation.address);
    const input = await estimateInput(pairAddress, collateral, obligation, amountOut);
    const estimatedInput = input.toNumber();

    await reconnect(obligation, ObligationFactory, bob).setBtcAddress(btcHash, Script.p2sh);
    await reconnect(optionLib, OptionLibFactory, bob)
      .lockAndBuy(
        obligation.address,
        amountOut,
        amountInMax);

    const obligationBalance = (await obligation.balanceObl(bobAddress)).toNumber();
    expect(obligationBalance).to.eq(amountOut);
    const collateralBalance = (await collateral.balanceOf(bobAddress)).toNumber();
    expect(collateralBalance).to.eq(amountInMax - estimatedInput);

    // alice and eve should have collateral back
    // const aliceCollateral1 = (await collateral.balanceOf(aliceAddress)).toNumber();
    // expect(aliceCollateral1).to.eq(aliceCollateral0 + (amountOut/2));
    // const eveCollateral1 = (await collateral.balanceOf(eveAddress)).toNumber();
    // expect(eveCollateral1).to.eq(eveCollateral0 + (amountOut/2));
  });
});

describe("Put Option (5 Writers, 2 Buyers)", () => {
  let signers: Signer[];
  let addresses: string[];
  
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;

  let option: Option;
  let obligation: Obligation;
  let treasury: Treasury;

  const init = getTimeNow();
  const strikePrice = 5;
  const premiumAmounts = [
    234, 124, 235, 756, 567
  ];
  const collateralAmounts = [
    12_381, 10_239, 15_239, 19_042, 9000
  ];

  const amountInMax7 = 3123;
  const amountOut7 = 615;

  const amountInMax8 = 2344;
  const amountOut8 = 300;

  before(async () => {
    signers = await ethers.signers();

    addresses = await Promise.all([
      signers[0].getAddress(),
      // sellers
      signers[1].getAddress(),
      signers[2].getAddress(),
      signers[3].getAddress(),
      signers[4].getAddress(),
      signers[5].getAddress(),
      signers[6].getAddress(),
      // buyers
      signers[7].getAddress(),
      signers[8].getAddress(),
    ]);

    ({ btcReferee, optionFactory, collateral, optionLib } = await loadContracts(signers[0]));
  });

  it("should create option contract", async () => {
    await optionFactory.createPair(init + 1000, 1000, strikePrice, collateral.address, btcReferee.address);
    const optionAddress = await optionFactory.options(0);
    option = OptionFactory.connect(optionAddress, signers[0]);

    const obligationAddress = await optionFactory.getObligation(option.address);
    obligation = ObligationFactory.connect(obligationAddress, signers[0]);

    const treasuryAddress = await optionFactory.getTreasury(collateral.address);
    treasury = TreasuryFactory.connect(treasuryAddress, signers[0]);
  });

  const underwrite = async (signer: Signer, premiumAmount: number, collateralAmount: number) => {
    const address = await signer.getAddress();
    await mint(collateral, signer, address, premiumAmount + collateralAmount);
    await approve(collateral, signer, optionLib.address, premiumAmount + collateralAmount);

    await reconnect(optionLib, OptionLibFactory, signer)
      .lockAndWrite(option.address, premiumAmount, collateralAmount, btcHash, Script.p2sh);

    const obligationBalance = (await obligation.balanceObl(address)).toNumber();
    expect(obligationBalance).to.eq(collateralAmount);
  };

  it("should write options", async () => {
    await Promise.all(signers.slice(1, 6).map((signer, i) => 
      underwrite(signer, premiumAmounts[i], collateralAmounts[i])));
  });

  const buy = async (signer: Signer, amountOut: number, amountInMax: number) => {
    const address = await signer.getAddress();
    await mint(collateral, signer, address, amountInMax);
    await approve(collateral, signer, optionLib.address, amountInMax);

    await reconnect(optionLib, OptionLibFactory, signer)
      .swapTokensForExactTokens(
        amountOut,
        amountInMax,
        collateral.address,
        option.address);

    const optionBalance = (await option.balanceOf(address)).toNumber();
    expect(optionBalance).to.eq(amountOut);
  };

  it("should buy options", async () => {
    await buy(signers[7], amountOut7, amountInMax7);
    await buy(signers[8], amountOut8, amountInMax8);
  });

  it("should exercise options after expiry", async () => {
    await evmSnapFastForward(1000, async () => {

      // TODO: check repeated call fails
      await reconnect(option, OptionFactory, signers[7])
        .requestExercise(
          addresses[1],
          115);

      const secret = (await obligation.getSecret(addresses[7], addresses[1])).toNumber();
      await btcReferee.mock.verifyTx.returns((115 / strikePrice) + secret);

      await reconnect(option, OptionFactory, signers[7])
        .executeExercise(
          addresses[1],
          0,
          0,
          Buffer.alloc(32, 0),
          Buffer.alloc(32, 0),
          Buffer.alloc(32, 0));

      const obligationBalance1 = (await obligation.balanceObl(addresses[1])).toNumber();
      expect(obligationBalance1).to.eq(collateralAmounts[0] - 115);

      const obligationBalance2 = (await obligation.balanceObl(addresses[2])).toNumber();
      expect(obligationBalance2).to.eq(collateralAmounts[1]);
    });
  });
});