import {ethers} from '@nomiclabs/buidler';
import {Signer, Wallet, constants} from 'ethers';
import chai from 'chai';
import {solidity, deployMockContract, MockContract} from 'ethereum-waffle';
import {MockCollateralFactory} from '../typechain/MockCollateralFactory';
import {OptionFactory} from '../typechain/OptionFactory';
import {OptionPairFactoryFactory} from '../typechain/OptionPairFactoryFactory';
import {ErrorCode, Script} from '../lib/constants';
import {MockCollateral} from '../typechain/MockCollateral';
import {OptionLibFactory} from '../typechain/OptionLibFactory';
import {OptionLib} from '../typechain/OptionLib';
import {deploy0, reconnect, getRequestEvent} from '../lib/contracts';
import {Option} from '../typechain/Option';
import {OptionPairFactory} from '../typechain/OptionPairFactory';
import {ObligationFactory} from '../typechain/ObligationFactory';
import {deployUniswapFactory, estimateInput} from '../lib/uniswap';
import {Ierc20} from '../typechain/Ierc20';
import {Ierc20Factory} from '../typechain/Ierc20Factory';
import {Obligation} from '../typechain/Obligation';
import {IUniswapV2Factory} from '../typechain/IUniswapV2Factory';
import BTCRefereeArtifact from '../artifacts/BTCReferee.json';
import {
  getCreate2OptionAddress,
  getCreate2ObligationAddress
} from '../lib/addresses';
import {evmSnapFastForward} from '../lib/mock';
import {BigNumberish} from 'ethers';
import {deployPair, getTimeNow} from './common';
import {newBigNum} from '../lib/conversion';

chai.use(solidity);
const {expect} = chai;

type Contracts = {
  uniswapFactory: IUniswapV2Factory;
  collateral: MockCollateral;
  optionFactory: OptionPairFactory;
  optionLib: OptionLib;
  btcReferee: MockContract;
};

const btcHash = '0x5587090c3288b46df8cc928c6910a8c1bbea508f';

async function loadContracts(signer: Signer): Promise<Contracts> {
  const account = await signer.getAddress();
  const uniswapFactory = (await deployUniswapFactory(
    signer,
    account
  )) as IUniswapV2Factory;
  const optionPairFactory = await deploy0(signer, OptionPairFactoryFactory);
  const optionLibFactory = new OptionLibFactory(signer);
  const optionLib = await optionLibFactory.deploy(
    uniswapFactory.address,
    constants.AddressZero
  );

  return {
    uniswapFactory: uniswapFactory,
    collateral: await deploy0(signer, MockCollateralFactory),
    optionFactory: optionPairFactory,
    optionLib: optionLib,
    btcReferee: await deployMockContract(
      signer as Wallet,
      BTCRefereeArtifact.abi
    )
  };
}

const mint = async function (
  collateral: MockCollateral,
  signer: Signer,
  address: string,
  amount: BigNumberish
): Promise<void> {
  await reconnect(collateral, MockCollateralFactory, signer).mint(
    address,
    amount
  );
  // expect((await collateral.balanceOf(address)).toNumber()).to.eq(amount);
};

const approve = async function (
  collateral: Ierc20,
  signer: Signer,
  spender: string,
  amount: BigNumberish
): Promise<void> {
  await reconnect(collateral, Ierc20Factory, signer).approve(spender, amount);
};

describe('Sanity Checks', () => {
  let alice: Signer;

  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let btcReferee: MockContract;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const strikePrice = 500;

  beforeEach(async () => {
    [alice] = await ethers.getSigners();
    ({btcReferee, optionFactory, collateral} = await loadContracts(alice));
  });

  it('should fail to create an expired option', async () => {
    const result = optionFactory.createPair(
      getTimeNow(),
      windowSize,
      strikePrice,
      collateral.address,
      btcReferee.address
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it('should fail to create a zero-window option', async () => {
    const result = optionFactory.createPair(
      expiryTime,
      0,
      strikePrice,
      collateral.address,
      btcReferee.address
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_WINDOW_ZERO);
  });

  it('should fail to create an option with 0 strikePrice', async () => {
    const result = optionFactory.createPair(
      expiryTime,
      windowSize,
      0,
      collateral.address,
      btcReferee.address
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_ZERO_STRIKE_PRICE);
  });

  it('should generate deterministic contract address', async () => {
    const salt = {
      expiryTime,
      windowSize,
      strikePrice,
      collateral: collateral.address,
      referee: btcReferee.address
    };

    await optionFactory.createPair(
      expiryTime,
      windowSize,
      strikePrice,
      collateral.address,
      btcReferee.address
    );
    const optionAddress0 = await optionFactory.options(0);

    const optionAddress1 = getCreate2OptionAddress(salt, optionFactory.address);
    expect(optionAddress0).to.eq(optionAddress1);

    const obligationAddress0 = await optionFactory.getObligation(
      optionAddress0
    );
    const obligationAddress1 = getCreate2ObligationAddress(
      salt,
      optionFactory.address
    );
    expect(obligationAddress0).to.eq(obligationAddress1);
  });
});

describe('Put Option (1 Writer, 1 Buyer) - Exercise Options [10**18]', () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let uniswapFactory: IUniswapV2Factory;
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;

  let option: Option;
  let obligation: Obligation;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const strikePrice = newBigNum(9000, 18);
  const amountOut = newBigNum(4500, 18);
  const amountOutSat = newBigNum(1, 10).div(2);
  const premiumAmount = newBigNum(200, 18);
  const collateralAmount = newBigNum(9000, 18);
  const amountInMax = newBigNum(2000, 18);

  before(async () => {
    [alice, bob, charlie] = await ethers.getSigners();
    ({
      btcReferee,
      optionFactory,
      collateral,
      uniswapFactory,
      optionLib
    } = await loadContracts(charlie));
    [aliceAddress, bobAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress()
    ]);
    ({option, obligation} = await deployPair(
      optionFactory,
      expiryTime,
      windowSize,
      strikePrice,
      collateral.address,
      btcReferee.address,
      charlie
    ));
  });

  it('alice should write put options', async () => {
    await mint(
      collateral,
      alice,
      aliceAddress,
      premiumAmount.add(collateralAmount)
    );
    await approve(
      collateral,
      alice,
      optionLib.address,
      premiumAmount.add(collateralAmount)
    );

    await reconnect(optionLib, OptionLibFactory, alice).lockAndWrite(
      obligation.address,
      collateral.address,
      collateral.address,
      collateralAmount,
      premiumAmount,
      0,
      0,
      btcHash,
      Script.p2sh
    );

    const pairAddress = await uniswapFactory.getPair(
      collateral.address,
      option.address
    );
    const optionBalance = await option.balanceOf(pairAddress);
    expect(optionBalance, 'options should be in pool').to.eq(collateralAmount);
  });

  it('bob should buy put options', async () => {
    await mint(collateral, bob, bobAddress, amountInMax);
    await approve(collateral, bob, optionLib.address, amountInMax);

    await reconnect(optionLib, OptionLibFactory, bob).swapTokensForExactTokens(
      amountOut,
      amountInMax,
      [collateral.address, option.address],
      bobAddress,
      expiryTime
    );

    const optionBalance = await option.balanceOf(bobAddress);
    expect(optionBalance, 'bob should own options').to.eq(amountOut);
  });

  it('bob cannot exercise before expiry', async () => {
    const result = reconnect(
      obligation,
      ObligationFactory,
      bob
    ).requestExercise(aliceAddress, amountOutSat);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);
  });

  it('bob cannot exercise more options than available', async () => {
    return evmSnapFastForward(1000, async () => {
      const result = reconnect(
        obligation,
        ObligationFactory,
        bob
      ).requestExercise(aliceAddress, amountOutSat.add(1));
      await expect(result).to.be.revertedWith(
        ErrorCode.ERR_TRANSFER_EXCEEDS_BALANCE
      );
    });
  });

  it('bob should exercise options against alice after expiry', async () => {
    return evmSnapFastForward(1000, async () => {
      const requestTx = await reconnect(
        obligation,
        ObligationFactory,
        bob
      ).requestExercise(aliceAddress, amountOutSat);
      const requestEvent = await getRequestEvent(
        obligation,
        bobAddress,
        aliceAddress,
        await requestTx.wait(0)
      );

      await btcReferee.mock.verifyTx.returns(
        amountOutSat.add(requestEvent.secret)
      );

      await reconnect(obligation, ObligationFactory, bob).executeExercise(
        requestEvent.id,
        0,
        0,
        constants.HashZero,
        constants.HashZero,
        constants.HashZero
      );

      const optionBalance = await option.balanceOf(bobAddress);
      expect(optionBalance, 'bob should have no options').to.eq(constants.Zero);

      const obligationBalance = await obligation.obligations(aliceAddress);
      expect(obligationBalance).to.eq(collateralAmount.sub(amountOut));
    });
  });
});

describe('Put Option (1 Writer, 1 Buyer) - Exercise Options [10**6]', () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let uniswapFactory: IUniswapV2Factory;
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;

  let option: Option;
  let obligation: Obligation;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const strikePrice = newBigNum(9000, 6);
  const amountOut = newBigNum(4500, 6);
  const amountOutSat = newBigNum(1, 10).div(2);
  const premiumAmount = newBigNum(200, 6);
  const collateralAmount = newBigNum(9000, 6);
  const amountInMax = newBigNum(2000, 6);

  before(async () => {
    [alice, bob, charlie] = await ethers.getSigners();
    ({
      btcReferee,
      optionFactory,
      collateral,
      uniswapFactory,
      optionLib
    } = await loadContracts(charlie));
    [aliceAddress, bobAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress()
    ]);
    ({option, obligation} = await deployPair(
      optionFactory,
      expiryTime,
      windowSize,
      strikePrice,
      collateral.address,
      btcReferee.address,
      charlie
    ));
  });

  it('alice should write put options', async () => {
    await mint(
      collateral,
      alice,
      aliceAddress,
      premiumAmount.add(collateralAmount)
    );
    await approve(
      collateral,
      alice,
      optionLib.address,
      premiumAmount.add(collateralAmount)
    );

    await reconnect(optionLib, OptionLibFactory, alice).lockAndWrite(
      obligation.address,
      collateral.address,
      collateral.address,
      collateralAmount,
      premiumAmount,
      0,
      0,
      btcHash,
      Script.p2sh
    );

    const pairAddress = await uniswapFactory.getPair(
      collateral.address,
      option.address
    );
    const optionBalance = await option.balanceOf(pairAddress);
    expect(optionBalance).to.eq(collateralAmount);
  });

  it('bob should buy put options', async () => {
    await mint(collateral, bob, bobAddress, amountInMax);
    await approve(collateral, bob, optionLib.address, amountInMax);

    await reconnect(optionLib, OptionLibFactory, bob).swapTokensForExactTokens(
      amountOut,
      amountInMax,
      [collateral.address, option.address],
      bobAddress,
      expiryTime
    );

    const optionBalance = await option.balanceOf(bobAddress);
    expect(optionBalance).to.eq(amountOut);
  });

  it('bob cannot exercise before expiry', async () => {
    const result = reconnect(
      obligation,
      ObligationFactory,
      bob
    ).requestExercise(aliceAddress, amountOutSat);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NOT_EXPIRED);
  });

  it('bob cannot exercise more options than credited', async () => {
    return evmSnapFastForward(1000, async () => {
      const result = reconnect(
        obligation,
        ObligationFactory,
        bob
      ).requestExercise(aliceAddress, amountOutSat.add(100));
      await expect(result).to.be.revertedWith(
        ErrorCode.ERR_TRANSFER_EXCEEDS_BALANCE
      );
    });
  });

  it('bob should exercise options against alice after expiry', async () => {
    return evmSnapFastForward(1000, async () => {
      const requestTx = await reconnect(
        obligation,
        ObligationFactory,
        bob
      ).requestExercise(aliceAddress, amountOutSat);
      const requestEvent = await getRequestEvent(
        obligation,
        bobAddress,
        aliceAddress,
        await requestTx.wait(0)
      );

      await btcReferee.mock.verifyTx.returns(
        amountOutSat.add(requestEvent.secret)
      );

      await reconnect(obligation, ObligationFactory, bob).executeExercise(
        requestEvent.id,
        0,
        0,
        constants.HashZero,
        constants.HashZero,
        constants.HashZero
      );

      const optionBalance = await option.balanceOf(bobAddress);
      expect(optionBalance, 'bob should have no options').to.eq(constants.Zero);

      const obligationBalance = await obligation.obligations(aliceAddress);
      expect(obligationBalance).to.eq(collateralAmount.sub(amountOut));
    });
  });
});

describe('Put Option (1 Writer, 1 Buyer) - Refund Options [10**18]', () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let uniswapFactory: IUniswapV2Factory;
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;

  let option: Option;
  let obligation: Obligation;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const strikePrice = newBigNum(300, 18);
  const amountOut = newBigNum(4500, 18);
  const premiumAmount = newBigNum(200, 18);
  const collateralAmount = newBigNum(9000, 18);
  const amountInMax = newBigNum(2000, 18);

  before(async () => {
    [alice, bob, charlie] = await ethers.getSigners();
    ({
      btcReferee,
      optionFactory,
      collateral,
      uniswapFactory,
      optionLib
    } = await loadContracts(charlie));
    [aliceAddress, bobAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress()
    ]);
    ({option, obligation} = await deployPair(
      optionFactory,
      expiryTime,
      windowSize,
      strikePrice,
      collateral.address,
      btcReferee.address,
      charlie
    ));
  });

  it('alice should write put options', async () => {
    await mint(
      collateral,
      alice,
      aliceAddress,
      collateralAmount.add(premiumAmount)
    );
    await approve(
      collateral,
      alice,
      optionLib.address,
      collateralAmount.add(premiumAmount)
    );

    await reconnect(optionLib, OptionLibFactory, alice).lockAndWrite(
      obligation.address,
      collateral.address,
      collateral.address,
      collateralAmount,
      premiumAmount,
      collateralAmount,
      premiumAmount,
      btcHash,
      Script.p2sh
    );

    const pairAddress: string = await uniswapFactory.getPair(
      collateral.address,
      option.address
    );
    const optionBalance = await option.balanceOf(pairAddress);
    expect(optionBalance).to.eq(collateralAmount);
    const collateralBalance = await collateral.balanceOf(aliceAddress);
    expect(collateralBalance).to.eq(constants.Zero);
  });

  it('bob should buy put options', async () => {
    await mint(collateral, bob, bobAddress, amountInMax);
    await approve(collateral, bob, optionLib.address, amountInMax);

    await reconnect(optionLib, OptionLibFactory, bob).swapTokensForExactTokens(
      amountOut,
      amountInMax,
      [collateral.address, option.address],
      bobAddress,
      getTimeNow() + 1000
    );

    const optionBalance = await option.balanceOf(bobAddress);
    expect(optionBalance).to.eq(amountOut);
  });

  it('alice should refund options after expiry', async () => {
    const obligationBalance = await obligation.obligations(aliceAddress);
    expect(obligationBalance).to.eq(collateralAmount);
    await evmSnapFastForward(2000, async () => {
      await reconnect(obligation, ObligationFactory, alice).refund(
        collateralAmount
      );
      const obligationBalance = await obligation.obligations(aliceAddress);
      expect(obligationBalance).to.eq(constants.Zero);
      const collateralBalance = await collateral.balanceOf(aliceAddress);
      expect(collateralBalance).to.eq(collateralAmount);
    });
  });
});

describe('Put Option (1 Writer, 1 Buyer) - Transfer Obligations [10**18]', () => {
  let alice: Signer;
  let charlie: Signer;
  let eve: Signer;

  let aliceAddress: string;
  let eveAddress: string;

  let uniswapFactory: IUniswapV2Factory;
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;

  let option: Option;
  let obligation: Obligation;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const strikePrice = newBigNum(8000, 18);
  const amountOut = newBigNum(2000, 18);
  const premiumAmount = newBigNum(123, 18);
  const collateralAmount = newBigNum(10_000, 18);
  const amountInMax = newBigNum(4000, 18);
  const collateralPremium = newBigNum(3000, 18);
  const obligationAmount = newBigNum(5_000, 18);

  before(async () => {
    [alice, charlie, eve] = await ethers.getSigners();
    ({
      btcReferee,
      optionFactory,
      collateral,
      uniswapFactory,
      optionLib
    } = await loadContracts(charlie));
    [aliceAddress, eveAddress] = await Promise.all([
      alice.getAddress(),
      eve.getAddress()
    ]);
    ({option, obligation} = await deployPair(
      optionFactory,
      expiryTime,
      windowSize,
      strikePrice,
      collateral.address,
      btcReferee.address,
      charlie
    ));
  });

  it('alice should write options', async () => {
    await mint(
      collateral,
      alice,
      aliceAddress,
      collateralAmount.add(premiumAmount)
    );
    await approve(
      collateral,
      alice,
      optionLib.address,
      collateralAmount.add(premiumAmount)
    );

    await reconnect(optionLib, OptionLibFactory, alice).lockAndWrite(
      obligation.address,
      collateral.address,
      collateral.address,
      collateralAmount,
      premiumAmount,
      collateralAmount,
      premiumAmount,
      btcHash,
      Script.p2sh
    );

    const obligationBalance = await obligation.balanceOf(aliceAddress);
    expect(obligationBalance).to.eq(collateralAmount);

    const pairAddress = await uniswapFactory.getPair(
      collateral.address,
      option.address
    );
    const optionBalance = await option.balanceOf(pairAddress);
    expect(optionBalance).to.eq(collateralAmount);
  });

  it('alice should sell obligations', async () => {
    await mint(collateral, alice, aliceAddress, collateralPremium);
    await approve(collateral, alice, optionLib.address, collateralPremium);
    await approve(obligation, alice, optionLib.address, obligationAmount);

    await reconnect(optionLib, OptionLibFactory, alice).addLiquidity(
      collateral.address,
      obligation.address,
      collateralPremium,
      obligationAmount,
      collateralPremium,
      obligationAmount,
      aliceAddress,
      expiryTime
    );

    const obligationBalance = await obligation.balanceOf(aliceAddress);
    expect(obligationBalance).to.eq(collateralAmount.sub(obligationAmount));
    const collateralBalance = await collateral.balanceOf(aliceAddress);
    expect(collateralBalance).to.eq(0);
  });

  it("eve can't buy obligations without collateral / btc address", async () => {
    const result = reconnect(
      optionLib,
      OptionLibFactory,
      eve
    ).swapTokensForExactTokens(
      amountOut,
      amountInMax,
      [collateral.address, option.address],
      eveAddress,
      expiryTime
    );

    await expect(result).to.be.reverted;
  });

  it('eve should set btc address and buy obligations', async () => {
    await mint(collateral, eve, eveAddress, amountInMax.add(amountOut));
    await approve(
      collateral,
      eve,
      optionLib.address,
      amountInMax.add(amountOut)
    );

    const pairAddress = await uniswapFactory.getPair(
      collateral.address,
      obligation.address
    );
    const input = await estimateInput(
      pairAddress,
      collateral,
      obligation,
      amountOut
    );

    await reconnect(obligation, ObligationFactory, eve).setBtcAddress(
      btcHash,
      Script.p2sh
    );
    await reconnect(optionLib, OptionLibFactory, eve).lockAndBuy(
      amountOut,
      amountInMax,
      [collateral.address, obligation.address]
    );

    const obligationBalance = await obligation.obligations(eveAddress);
    expect(obligationBalance).to.eq(amountOut);

    const collateralBalance = await collateral.balanceOf(eveAddress);
    expect(collateralBalance).to.eq(amountInMax.sub(input));

    // TODO: alice should withdraw
  });
});

describe('Put Option (2 Writers, 1 Buyer) - Transfer Obligations [10*18]', () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;
  let eve: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let eveAddress: string;

  let uniswapFactory: IUniswapV2Factory;
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;

  let option: Option;
  let obligation: Obligation;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const strikePrice = newBigNum(8000, 18);
  const amountOut = newBigNum(2000, 18);
  const premiumAmount = newBigNum(123, 18);
  const collateralAmount = newBigNum(10_000, 18);
  const amountInMax = newBigNum(4000, 18);
  const collateralPremium = newBigNum(3000, 18);
  const obligationAmount = newBigNum(5_000, 18);

  before(async () => {
    [alice, bob, charlie, eve] = await ethers.getSigners();
    ({
      btcReferee,
      optionFactory,
      collateral,
      uniswapFactory,
      optionLib
    } = await loadContracts(charlie));
    [aliceAddress, bobAddress, eveAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress(),
      eve.getAddress()
    ]);
    ({option, obligation} = await deployPair(
      optionFactory,
      expiryTime,
      windowSize,
      strikePrice,
      collateral.address,
      btcReferee.address,
      charlie
    ));
  });

  it('alice and eve should write options', async () => {
    const write = async (signer: Signer, address: string): Promise<void> => {
      await mint(
        collateral,
        signer,
        address,
        collateralAmount.add(premiumAmount)
      );
      await approve(
        collateral,
        signer,
        optionLib.address,
        collateralAmount.add(premiumAmount)
      );

      await reconnect(optionLib, OptionLibFactory, signer).lockAndWrite(
        obligation.address,
        collateral.address,
        collateral.address,
        collateralAmount,
        premiumAmount,
        collateralAmount,
        premiumAmount,
        btcHash,
        Script.p2sh
      );

      const obligationBalance = await obligation.obligations(address);
      expect(obligationBalance).to.eq(collateralAmount);
    };

    await write(alice, aliceAddress);
    await write(eve, eveAddress);
  });

  it('alice and eve should sell obligations', async () => {
    await uniswapFactory.createPair(collateral.address, obligation.address);
    const pairAddress = await uniswapFactory.getPair(
      collateral.address,
      obligation.address
    );

    const addLiquidity = async (
      signer: Signer,
      address: string
    ): Promise<void> => {
      await mint(collateral, signer, address, collateralPremium);
      await approve(collateral, signer, optionLib.address, collateralPremium);
      await approve(obligation, signer, optionLib.address, obligationAmount);

      const obligationBalance0 = await obligation.balanceOf(pairAddress);

      await reconnect(optionLib, OptionLibFactory, signer).addLiquidity(
        collateral.address,
        obligation.address,
        collateralPremium,
        obligationAmount,
        collateralPremium,
        obligationAmount,
        address,
        getTimeNow() + 1000
      );

      const obligationBalance1 = await obligation.balanceOf(pairAddress);
      expect(obligationBalance1).to.eq(
        obligationBalance0.add(obligationAmount)
      );
    };

    await addLiquidity(alice, aliceAddress);
    await addLiquidity(eve, eveAddress);
  });

  it('bob should buy obligations from the pool', async () => {
    await mint(collateral, bob, bobAddress, amountInMax.add(amountOut));
    await approve(
      collateral,
      bob,
      optionLib.address,
      amountInMax.add(amountOut)
    );

    const pairAddress = await uniswapFactory.getPair(
      collateral.address,
      obligation.address
    );
    const input = await estimateInput(
      pairAddress,
      collateral,
      obligation,
      amountOut
    );

    await reconnect(obligation, ObligationFactory, bob).setBtcAddress(
      btcHash,
      Script.p2sh
    );
    await reconnect(optionLib, OptionLibFactory, bob).lockAndBuy(
      amountOut,
      amountInMax,
      [collateral.address, obligation.address]
    );

    const obligationBalance = await obligation.obligations(bobAddress);
    expect(obligationBalance).to.eq(amountOut);
    const collateralBalance = await collateral.balanceOf(bobAddress);
    expect(collateralBalance).to.eq(amountInMax.sub(input));

    // TODO: alice and eve should have collateral back
  });
});

// describe("Put Option (5 Writers, 2 Buyers)", () => {
//   let signers: Signer[];
//   let addresses: string[];

//   let collateral: MockCollateral;
//   let optionFactory: OptionPairFactory;
//   let optionLib: OptionLib;
//   let btcReferee: MockContract;

//   let option: Option;
//   let obligation: Obligation;
//   let treasury: Treasury;

//   const init = getTimeNow();
//   const strikePrice = 5;
//   const premiumAmounts = [
//     234, 124, 235, 756, 567
//   ];
//   const collateralAmounts = [
//     12_381, 10_239, 15_239, 19_042, 9000
//   ];

//   const amountInMax7 = 3123;
//   const amountOut7 = 615;

//   const amountInMax8 = 2344;
//   const amountOut8 = 300;

//   before(async () => {
//     signers = await ethers.signers();

//     addresses = await Promise.all([
//       signers[0].getAddress(),
//       // sellers
//       signers[1].getAddress(),
//       signers[2].getAddress(),
//       signers[3].getAddress(),
//       signers[4].getAddress(),
//       signers[5].getAddress(),
//       signers[6].getAddress(),
//       // buyers
//       signers[7].getAddress(),
//       signers[8].getAddress(),
//     ]);

//     ({ btcReferee, optionFactory, collateral, optionLib } = await loadContracts(signers[0]));
//   });

//   it("should create option contract", async () => {
//     await optionFactory.createPair(init + 1000, 1000, strikePrice, collateral.address, btcReferee.address);
//     const optionAddress = await optionFactory.options(0);
//     option = OptionFactory.connect(optionAddress, signers[0]);

//     const obligationAddress = await optionFactory.getObligation(option.address);
//     obligation = ObligationFactory.connect(obligationAddress, signers[0]);

//     const treasuryAddress = await optionFactory.getTreasury(collateral.address);
//     treasury = TreasuryFactory.connect(treasuryAddress, signers[0]);
//   });

//   const write = async (signer: Signer, premiumAmount: number, collateralAmount: number) => {
//     const address = await signer.getAddress();
//     await mint(collateral, signer, address, premiumAmount + collateralAmount);
//     await approve(collateral, signer, optionLib.address, premiumAmount + collateralAmount);

//     await reconnect(optionLib, OptionLibFactory, signer)
//       .lockAndWrite(
//         obligation.address,
//         collateral.address,
//         collateral.address,
//         collateralAmount,
//         premiumAmount,
//         0,
//         0,
//         btcHash,
//         Script.p2sh
//       );

//     // const obligationBalance = (await obligation.obligations(address)).toNumber();
//     // expect(obligationBalance).to.eq(collateralAmount);
//   };

//   it("should write options", async () => {
//     await Promise.all(signers.slice(1, 6).map((signer, i) =>
//       write(signer, premiumAmounts[i], collateralAmounts[i])));
//   });

//   const buy = async (signer: Signer, amountOut: number, amountInMax: number) => {
//     const address = await signer.getAddress();
//     await mint(collateral, signer, address, amountInMax);
//     await approve(collateral, signer, optionLib.address, amountInMax);

//     await reconnect(optionLib, OptionLibFactory, signer)
//       .swapTokensForExactTokens(
//         amountOut,
//         amountInMax,
//         [collateral.address, option.address],
//         address,
//         getTimeNow() + 1000
//       );

//     const optionBalance = (await option.balanceOf(address)).toNumber();
//     expect(optionBalance).to.eq(amountOut);
//   };

//   it("should buy options", async () => {
//     await buy(signers[7], amountOut7, amountInMax7);
//     await buy(signers[8], amountOut8, amountInMax8);
//   });

//   it("should exercise options after expiry", async () => {
//     await evmSnapFastForward(1000, async () => {

//       // TODO: check repeated call fails
//       await reconnect(obligation, ObligationFactory, signers[7])
//         .requestExercise(
//           addresses[1],
//           115
//         );

//           const secret = (await reconnect(obligation, ObligationFactory, signers[7]).getSecret(addresses[1])).toNumber();
//       await btcReferee.mock.verifyTx.returns((115 / strikePrice) + secret);

//       await reconnect(obligation, ObligationFactory, signers[7])
//         .executeExercise(
//           addresses[1],
//           0,
//           0,
//           Buffer.alloc(32, 0),
//           Buffer.alloc(32, 0),
//           Buffer.alloc(32, 0)
//         );

//       const obligationBalance1 = (await obligation.obligations(addresses[1])).toNumber();
//       expect(obligationBalance1).to.eq(collateralAmounts[0] - 115);

//       const obligationBalance2 = (await obligation.obligations(addresses[2])).toNumber();
//       expect(obligationBalance2).to.eq(6560);
//     });
//   });
// });
