import chai from 'chai';
import {ethers} from '@nomiclabs/buidler';
import {Signer, constants, BigNumber} from 'ethers';
import {deploy0, getEvent, reconnect} from '../../lib/contracts';
import {getTimeNow} from '../common';
import {ErrorCode} from '../../lib/constants';
import {Option} from '../../typechain/Option';
import {OptionFactory} from '../../typechain';
import {evmSnapFastForward} from '../../lib/mock';

const {expect} = chai;

describe('Option.sol', () => {
  let alice: Signer;
  let bob: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let option: Option;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;

  beforeEach('should deploy option and mock dependencies', async () => {
    [alice, bob] = await ethers.getSigners();
    [aliceAddress, bobAddress] = await Promise.all([alice.getAddress(), bob.getAddress()]);
    option = await deploy0(alice, OptionFactory);
    await option.initialize(18, expiryTime, windowSize);
  });

  it('should create with owner', async () => {
    const result = await option.owner();
    expect(result).to.eq(aliceAddress);
  });

  it('should fail to initialize as expired', async () => {
    const result = option.initialize(18, getTimeNow(), 1000);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it('should only allow owner to mint', async () => {
    const result = reconnect(option, OptionFactory, bob).mint(bobAddress, 1000);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_CALLER_NOT_OWNER);
  });

  it('should mint options', async () => {
    const tx = await option.mint(aliceAddress, 1000);

    const fragment = option.interface.events['Transfer(address,address,uint256)'];
    const event = await getEvent(fragment, [constants.AddressZero, aliceAddress], await tx.wait(0), option);
    expect(event.value).to.eq(BigNumber.from(1000));

    const optionBalance = await option.balanceOf(aliceAddress);
    expect(optionBalance).to.eq(BigNumber.from(1000));
    const optionSupply = await option.totalSupply();
    expect(optionSupply).to.eq(BigNumber.from(1000));
  });

  it('should only allow owner to request exercise', async () => {
    const result = reconnect(option, OptionFactory, bob).requestExercise(aliceAddress, 1000);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_CALLER_NOT_OWNER);
  });

  it('should fail to request exercise with insufficient balance', async () => {
    return evmSnapFastForward(1000, async () => {
      const result = option.requestExercise(aliceAddress, 1000);
      await expect(result).to.be.revertedWith(ErrorCode.ERR_TRANSFER_EXCEEDS_BALANCE);
    });
  });

  it('should request exercise with sufficient balance', async () => {
    await option.mint(aliceAddress, 1000);
    return evmSnapFastForward(1000, async () => {
      await option.requestExercise(aliceAddress, 1000);
      const optionBalance = await option.balanceOf(aliceAddress);
      expect(optionBalance).to.eq(constants.Zero);
      const optionSupply = await option.totalSupply();
      expect(optionSupply).to.eq(constants.Zero);
    });
  });

  it('should transfer options', async () => {
    await option.mint(aliceAddress, 1000);

    await option.transfer(bobAddress, 1000);
    const optionBalanceAlice = await option.balanceOf(aliceAddress);
    expect(optionBalanceAlice).to.eq(constants.Zero);
    const optionBalanceBob = await option.balanceOf(bobAddress);
    expect(optionBalanceBob).to.eq(BigNumber.from(1000));
  });
});
