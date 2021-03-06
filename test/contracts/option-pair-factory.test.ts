import chai from 'chai';
import {ethers} from 'hardhat';
import {Signer} from 'ethers';
import {getCreatePairEvent, getEvent, deploy1} from '../../lib/contracts';
import {getTimeNow} from '../common';
import {ErrorCode} from '../../lib/constants';
import {OptionPairFactoryFactory, OptionFactory} from '../../typechain';
import {OptionPairFactory} from '../../typechain/OptionPairFactory';
import {deployMockContract, MockContract} from 'ethereum-waffle';
import ERC20Artifact from '../../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json';
import IUniswapV2FactoryArtifact from '../../artifacts/@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol/IUniswapV2Factory.json';
import BTCRefereeArtifact from '../../artifacts/contracts/BTCReferee.sol/BTCReferee.json';
import TreasuryArtifact from '../../artifacts/contracts/Treasury.sol/Treasury.json';
import {
  getCreate2OptionAddress,
  getCreate2ObligationAddress
} from '../../lib/addresses';
import {newBigNum} from '../../lib/conversion';

const {expect} = chai;

describe('OptionPairFactory.sol', () => {
  let alice: Signer;

  let optionFactory: OptionPairFactory;
  let collateral: MockContract;
  let referee: MockContract;

  let treasury: MockContract;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const decimals = 18;
  const strikePrice = newBigNum(9000, decimals);

  beforeEach('should deploy option pair factory', async () => {
    [alice] = await ethers.getSigners();
    [optionFactory, collateral, referee] = await Promise.all([
      deployMockContract(
        alice,
        IUniswapV2FactoryArtifact.abi
      ).then((uniswapFactory: MockContract) =>
        deploy1(alice, OptionPairFactoryFactory, uniswapFactory.address)
      ),
      deployMockContract(alice, ERC20Artifact.abi),
      deployMockContract(alice, BTCRefereeArtifact.abi)
    ]);
  });

  it('should fail to create an option pair with unsupported collateral', async () => {
    await collateral.mock.decimals.returns(decimals);
    const result = optionFactory.createPair(
      expiryTime,
      windowSize,
      strikePrice,
      collateral.address,
      referee.address
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NOT_SUPPORTED);
  });

  const setTreasury = async () => {
    treasury = await deployMockContract(alice, TreasuryArtifact.abi);
    await optionFactory.setTreasuryFor(collateral.address, treasury.address);
  };

  it('should fail to create an option pair without a treasury', async () => {
    await collateral.mock.decimals.returns(decimals);
    const result = optionFactory.createPair(
      expiryTime,
      windowSize,
      strikePrice,
      collateral.address,
      referee.address
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NOT_SUPPORTED);
  });

  it('should fail to create an expired option pair', async () => {
    await setTreasury();
    await collateral.mock.decimals.returns(decimals);
    await optionFactory.enableAsset(collateral.address);
    const result = optionFactory.createPair(
      getTimeNow(),
      windowSize,
      strikePrice,
      collateral.address,
      referee.address
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it('should fail to create a zero-window option pair', async () => {
    await setTreasury();
    await collateral.mock.decimals.returns(decimals);
    await optionFactory.enableAsset(collateral.address);
    const result = optionFactory.createPair(
      expiryTime,
      0,
      strikePrice,
      collateral.address,
      referee.address
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_WINDOW_ZERO);
  });

  it('should fail to create an option pair with 0 strikePrice', async () => {
    await setTreasury();
    await collateral.mock.decimals.returns(decimals);
    await optionFactory.enableAsset(collateral.address);
    const result = optionFactory.createPair(
      expiryTime,
      windowSize,
      0,
      collateral.address,
      referee.address
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_ZERO_STRIKE_PRICE);
  });

  it('should create an option pair with decimals', async () => {
    await setTreasury();
    await treasury.mock.authorize.returns();

    await collateral.mock.decimals.returns(decimals);
    await optionFactory.enableAsset(collateral.address);
    const receipt = await optionFactory
      .createPair(
        expiryTime,
        windowSize,
        strikePrice,
        collateral.address,
        referee.address
      )
      .then((tx) => tx.wait(0));
    const event = await getCreatePairEvent(optionFactory, receipt);
    expect(event.expiryTime).to.eq(expiryTime);
    expect(event.windowSize).to.eq(windowSize);
    expect(event.strikePrice).to.eq(strikePrice);

    const optionAddress = event.option;
    const option = OptionFactory.connect(optionAddress, alice);
    expect(await option.decimals()).to.eq(decimals);

    const obligationAddress = event.obligation;
    const obligation = OptionFactory.connect(obligationAddress, alice);
    expect(await obligation.decimals()).to.eq(decimals);
  });

  it('should generate deterministic contract addresses', async () => {
    await setTreasury();
    await treasury.mock.authorize.returns();

    const salt = {
      expiryTime,
      windowSize,
      strikePrice,
      collateral: collateral.address,
      referee: referee.address
    };

    await collateral.mock.decimals.returns(decimals);
    await optionFactory.enableAsset(collateral.address);
    const tx = await optionFactory.createPair(
      expiryTime,
      windowSize,
      strikePrice,
      collateral.address,
      referee.address
    );

    const fragment =
      optionFactory.interface.events[
        'CreatePair(address,address,address,uint256,uint256,uint256)'
      ];
    const event = await getEvent(fragment, [], await tx.wait(0), optionFactory);

    const optionAddress0 = event.option;
    const obligationAddress0 = event.obligation;

    const optionAddress1 = getCreate2OptionAddress(salt, optionFactory.address);
    expect(optionAddress0).to.eq(optionAddress1);

    const obligationAddress1 = getCreate2ObligationAddress(
      salt,
      optionFactory.address
    );
    expect(obligationAddress0).to.eq(obligationAddress1);
  });
});
