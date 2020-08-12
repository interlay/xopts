import chai from 'chai';
import {ethers} from '@nomiclabs/buidler';
import {Signer, constants, BigNumber} from 'ethers';
import {deploy0, getEvent} from '../../lib/contracts';
import {getTimeNow} from '../common';
import {MockContract, deployMockContract} from 'ethereum-waffle';
import ObligationArtifact from '../../artifacts/Obligation.json';
import {ErrorCode, Script} from '../../lib/constants';
import {Option} from '../../typechain/Option';
import {OptionFactory} from '../../typechain';
import {evmSnapFastForward} from '../../lib/mock';

const {expect} = chai;

const btcHash = '0x5587090c3288b46df8cc928c6910a8c1bbea508f';

describe('Option.sol', () => {
  let alice: Signer;
  let bob: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let option: Option;
  let obligation: MockContract;

  const expiryTime = getTimeNow() + 1000;
  const windowSize = 1000;

  beforeEach('should deploy option and mock dependencies', async () => {
    [alice, bob] = await ethers.getSigners();
    [aliceAddress, bobAddress] = await Promise.all([
      alice.getAddress(),
      bob.getAddress()
    ]);
    [option, obligation] = await Promise.all([
      deploy0(alice, OptionFactory),
      deployMockContract(alice, ObligationArtifact.abi)
    ]);
    await option.initialize(18, expiryTime, windowSize, obligation.address);
  });

  it('should create with owner', async () => {
    const result = await option.owner();
    expect(result).to.eq(aliceAddress);
  });

  it('should fail to initialize as expired', async () => {
    const result = option.initialize(
      18,
      getTimeNow(),
      1000,
      obligation.address
    );
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INIT_EXPIRED);
  });

  it('should mint options', async () => {
    await obligation.mock.mint.returns();
    const tx = await option.mint(
      aliceAddress,
      aliceAddress,
      1000,
      btcHash,
      Script.p2sh
    );

    const fragment =
      option.interface.events['Transfer(address,address,uint256)'];
    const event = await getEvent(
      fragment,
      [constants.AddressZero, aliceAddress],
      await tx.wait(0),
      obligation
    );
    expect(event.value).to.eq(BigNumber.from(1000));

    const optionBalance = await option.balanceOf(aliceAddress);
    expect(optionBalance).to.eq(BigNumber.from(1000));
    const optionSupply = await option.totalSupply();
    expect(optionSupply).to.eq(BigNumber.from(1000));
  });

  it('should fail to request exercise with insufficient balance', async () => {
    await obligation.mock.requestExercise.returns(1000);
    return evmSnapFastForward(1000, async () => {
      const result = option.requestExercise(constants.AddressZero, 1000);
      await expect(result).to.be.revertedWith(
        ErrorCode.ERR_TRANSFER_EXCEEDS_BALANCE
      );
    });
  });

  it('should request exercise with sufficient balance', async () => {
    await obligation.mock.mint.returns();
    await obligation.mock.requestExercise.returns(1000);
    await option.mint(aliceAddress, aliceAddress, 1000, btcHash, Script.p2sh);
    return evmSnapFastForward(1000, async () => {
      await option.requestExercise(constants.AddressZero, 1000);
      const optionBalance = await option.balanceOf(aliceAddress);
      expect(optionBalance).to.eq(constants.Zero);
      const optionSupply = await option.totalSupply();
      expect(optionSupply).to.eq(constants.Zero);
    });
  });

  it('should transfer options', async () => {
    await obligation.mock.mint.returns();
    await option.mint(aliceAddress, aliceAddress, 1000, btcHash, Script.p2sh);

    await option.transfer(bobAddress, 1000);
    const optionBalanceAlice = await option.balanceOf(aliceAddress);
    expect(optionBalanceAlice).to.eq(constants.Zero);
    const optionBalanceBob = await option.balanceOf(bobAddress);
    expect(optionBalanceBob).to.eq(BigNumber.from(1000));
  });
});
