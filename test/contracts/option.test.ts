import chai from 'chai';
import {ethers} from 'hardhat';
import {Signer, constants, BigNumber} from 'ethers';
import {deploy0, getEvent, reconnect} from '../../lib/contracts';
import {getTimeNow} from '../common';
import {ErrorCode} from '../../lib/constants';
import {Option} from '../../typechain/Option';
import {OptionFactory} from '../../typechain';
import {evmSnapFastForward} from '../../lib/mock';
import {MockContract, deployMockContract} from 'ethereum-waffle';
import IUniswapV2PairArtifact from '../../artifacts/@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol/IUniswapV2Pair.json';

const {expect} = chai;

describe('Option.sol', () => {
  let alice: Signer;
  let bob: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let option: Option;
  let uniswapPair: MockContract;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;

  beforeEach('should deploy option and mock dependencies', async () => {
    [alice, bob] = await ethers.getSigners();
    [aliceAddress, bobAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress()
    ]);
    option = await deploy0(alice, OptionFactory);
    await option.initialize(18, expiryTime, windowSize);
    uniswapPair = await deployMockContract(alice, IUniswapV2PairArtifact.abi);
  });

  it('should create with owner', async () => {
    const result = await option.owner();
    expect(result).to.eq(aliceAddress);
  });

  it('should fail to initialize as expired', async () => {
    const result = option.initialize(18, getTimeNow(), 1000);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it('should only allow owner to mint to pool', async () => {
    const result = reconnect(option, OptionFactory, bob).mintToPool(
      aliceAddress,
      bobAddress,
      1000
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_CALLER_NOT_OWNER);
  });

  it('should only allow owner to mint to writer', async () => {
    const result = reconnect(option, OptionFactory, bob).mintToWriter(
      aliceAddress,
      1000
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_CALLER_NOT_OWNER);
  });

  it('should mint options to pool', async () => {
    await uniswapPair.mock.mint.returns(0);
    const tx = await option.mintToPool(aliceAddress, uniswapPair.address, 1000);

    const fragment =
      option.interface.events['Transfer(address,address,uint256)'];
    const event = await getEvent(
      fragment,
      [constants.AddressZero, uniswapPair.address],
      await tx.wait(0),
      option
    );
    expect(event.value).to.eq(BigNumber.from(1000));

    const optionBalance = await option.balanceOf(uniswapPair.address);
    expect(optionBalance).to.eq(BigNumber.from(1000));
    const optionSupply = await option.totalSupply();
    expect(optionSupply).to.eq(BigNumber.from(1000));
  });

  it('should mint options to writer', async () => {
    const tx = await option.mintToWriter(aliceAddress, 1000);

    const fragment =
      option.interface.events['Transfer(address,address,uint256)'];
    const event = await getEvent(
      fragment,
      [constants.AddressZero, aliceAddress],
      await tx.wait(0),
      option
    );
    expect(event.value).to.eq(BigNumber.from(1000));

    const optionBalance = await option.balanceOf(aliceAddress);
    expect(optionBalance).to.eq(BigNumber.from(1000));
    const optionSupply = await option.totalSupply();
    expect(optionSupply).to.eq(BigNumber.from(1000));
  });

  it('should only allow owner to request exercise', async () => {
    const result = reconnect(option, OptionFactory, bob).requestExercise(
      bobAddress,
      1000
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_CALLER_NOT_OWNER);
  });

  it('should fail to request exercise with insufficient balance', async () => {
    return evmSnapFastForward(1000, async () => {
      const result = option.requestExercise(bobAddress, 1000);
      await expect(result).to.be.revertedWith(
        ErrorCode.ERR_TRANSFER_EXCEEDS_BALANCE
      );
    });
  });

  it('should request exercise with sufficient balance', async () => {
    await uniswapPair.mock.mint.returns(0);
    await option.mintToPool(aliceAddress, uniswapPair.address, 1000);
    return evmSnapFastForward(1000, async () => {
      await option.requestExercise(uniswapPair.address, 1000);
      const optionBalance = await option.balanceOf(uniswapPair.address);
      expect(optionBalance).to.eq(constants.Zero);
      const optionSupply = await option.totalSupply();
      expect(optionSupply).to.eq(constants.Zero);
    });
  });
});
