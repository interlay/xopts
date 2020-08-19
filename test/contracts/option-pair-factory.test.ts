import chai from 'chai';
import {ethers} from '@nomiclabs/buidler';
import {Signer} from 'ethers';
import {deploy0, getCreatePairEvent} from '../../lib/contracts';
import {getTimeNow} from '../common';
import {ErrorCode} from '../../lib/constants';
import {OptionPairFactoryFactory, OptionFactory} from '../../typechain';
import {OptionPairFactory} from '../../typechain/OptionPairFactory';
import {deployMockContract, MockContract} from 'ethereum-waffle';
import ERC20Artifact from '../../artifacts/ERC20.json';
import BTCRefereeArtifact from '../../artifacts/BTCReferee.json';
import {
  getCreate2OptionAddress,
  getCreate2ObligationAddress
} from '../../lib/addresses';
import {newBigNum} from '../../lib/conversion';
import {option} from 'fast-check';

const {expect} = chai;

describe('OptionPairFactory.sol', () => {
  let alice: Signer;
  let bob: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let optionFactory: OptionPairFactory;
  let collateral: MockContract;
  let referee: MockContract;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;
  const decimals = 18;
  const strikePrice = newBigNum(9000, decimals);

  beforeEach('should deploy option pair factory', async () => {
    [alice, bob] = await ethers.getSigners();
    [aliceAddress, bobAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress()
    ]);
    optionFactory = await deploy0(alice, OptionPairFactoryFactory);
    collateral = await deployMockContract(alice, ERC20Artifact.abi);
    referee = await deployMockContract(alice, BTCRefereeArtifact.abi);
  });

  it('should fail to create an expired option pair', async () => {
    await collateral.mock.decimals.returns(decimals);
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
    await collateral.mock.decimals.returns(decimals);
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
    await collateral.mock.decimals.returns(decimals);
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
    await collateral.mock.decimals.returns(decimals);
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
    const salt = {
      expiryTime,
      windowSize,
      strikePrice,
      collateral: collateral.address,
      referee: referee.address
    };

    await collateral.mock.decimals.returns(decimals);
    await optionFactory.createPair(
      expiryTime,
      windowSize,
      strikePrice,
      collateral.address,
      referee.address
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
