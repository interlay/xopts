import {ethers} from 'hardhat';
import {Signer, Wallet, constants} from 'ethers';
import chai from 'chai';
import {solidity, deployMockContract, MockContract} from 'ethereum-waffle';
import {MockCollateralFactory} from '../../typechain/MockCollateralFactory';
import {OptionPairFactoryFactory} from '../../typechain/OptionPairFactoryFactory';
import {Script} from '../../lib/constants';
import {MockCollateral} from '../../typechain/MockCollateral';
import {OptionLibFactory} from '../../typechain/OptionLibFactory';
import {OptionLib} from '../../typechain/OptionLib';
import {deploy0, reconnect, deploy2, deploy1} from '../../lib/contracts';
import {Option} from '../../typechain/Option';
import {OptionPairFactory} from '../../typechain/OptionPairFactory';
import {deployUniswapFactory} from '../../lib/uniswap';
import {Obligation} from '../../typechain/Obligation';
import {IUniswapV2Factory} from '../../typechain/IUniswapV2Factory';
import BTCRefereeArtifact from '../../artifacts/contracts/BTCReferee.sol/BTCReferee.json';
import {evmSnapFastForward} from '../../lib/mock';
import {deployPair, getTimeNow} from '../common';
import {newBigNum} from '../../lib/conversion';
import {Treasury} from '../../typechain/Treasury';
import {TreasuryFactory} from '../../typechain';

chai.use(solidity);
const {expect} = chai;

const btcHash = '0x5587090c3288b46df8cc928c6910a8c1bbea508f';

describe('Put Option (1 Writer, 1 Buyer) - Exercise Options [10**18]', () => {
  let alice: Signer;
  let bob: Signer;
  let charlie: Signer;

  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;

  let uniswapFactory: IUniswapV2Factory;
  let collateral: MockCollateral;
  let optionFactory: OptionPairFactory;
  let optionLib: OptionLib;
  let btcReferee: MockContract;

  let optionA: Option;
  let optionB: Option;

  let obligationA: Obligation;
  let obligationB: Obligation;

  let treasury: Treasury;

  const expiryTimeA = getTimeNow() + 1000;
  const windowSizeA = 1000;

  const expiryTimeB = expiryTimeA + 5000;
  const windowSizeB = 1000;

  const strikePriceA = newBigNum(9000, 18);
  const strikePriceB = newBigNum(9000, 18);

  const premiumAmountA = newBigNum(200, 18);
  const premiumAmountB = newBigNum(1, 18);

  const collateralAmount = newBigNum(9000, 18);

  const amountOut = newBigNum(4500, 18);
  const amountInMax = newBigNum(5, 18);

  before(async () => {
    [alice, bob, charlie] = await ethers.getSigners();
    [aliceAddress, bobAddress, charlieAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress(),
      charlie.getAddress()
    ]);
    uniswapFactory = await deployUniswapFactory(charlie, charlieAddress);
    [optionFactory, optionLib, collateral, btcReferee] = await Promise.all([
      deploy1(charlie, OptionPairFactoryFactory, uniswapFactory.address),
      deploy2(
        charlie,
        OptionLibFactory,
        uniswapFactory.address,
        constants.AddressZero
      ),
      deploy0(charlie, MockCollateralFactory),
      deployMockContract(charlie as Wallet, BTCRefereeArtifact.abi)
    ]);

    ({option: optionA, obligation: obligationA, treasury} = await deployPair(
      optionFactory,
      expiryTimeA,
      windowSizeA,
      strikePriceA,
      collateral.address,
      btcReferee.address,
      charlie
    ));

    ({option: optionB, obligation: obligationB} = await deployPair(
      optionFactory,
      expiryTimeB,
      windowSizeB,
      strikePriceB,
      collateral.address,
      btcReferee.address,
      charlie
    ));
  });

  it('should write put options', async () => {
    await reconnect(collateral, MockCollateralFactory, alice).mint(
      aliceAddress,
      premiumAmountA.add(collateralAmount)
    );

    await reconnect(collateral, MockCollateralFactory, alice).approve(
      optionLib.address,
      premiumAmountA.add(collateralAmount)
    );

    await reconnect(treasury, TreasuryFactory, alice).position(
      0,
      constants.MaxUint256,
      expiryTimeB + windowSizeB + windowSizeB,
      btcHash,
      Script.p2sh
    );

    await reconnect(optionLib, OptionLibFactory, alice).lockAndWriteToPool(
      obligationA.address,
      collateral.address,
      collateral.address,
      collateralAmount,
      premiumAmountA,
      0,
      0
    );

    const pairAddress = await uniswapFactory.getPair(
      collateral.address,
      optionA.address
    );
    const optionBalance = await optionA.balanceOf(pairAddress);
    expect(optionBalance, 'options should be in pool').to.eq(collateralAmount);
  });

  it('should re-write collateral', async () => {
    return evmSnapFastForward(2000, async () => {
      await reconnect(collateral, MockCollateralFactory, bob).mint(
        bobAddress,
        premiumAmountB.add(amountInMax)
      );

      await reconnect(collateral, MockCollateralFactory, bob).approve(
        optionLib.address,
        premiumAmountB.add(amountInMax)
      );

      await reconnect(optionLib, OptionLibFactory, bob).unlockAndMintAndBuy(
        obligationA.address,
        obligationB.address,
        collateral.address,
        aliceAddress,
        collateralAmount,
        premiumAmountB,
        0,
        0,
        amountOut,
        amountInMax
      );

      const pairAddress = await uniswapFactory.getPair(
        collateral.address,
        optionB.address
      );
      const optionBalance = await optionB.balanceOf(pairAddress);
      expect(optionBalance).to.eq(amountOut);
    });
  });
});
