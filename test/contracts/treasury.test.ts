import chai from 'chai';
import {Treasury} from '../../typechain/Treasury';
import {ethers} from '@nomiclabs/buidler';
import {Signer} from 'ethers';
import {deploy1} from '../../lib/contracts';
import {TreasuryFactory} from '../../typechain/TreasuryFactory';
import ERC20Artifact from '../../artifacts/ERC20.json';

import {MockContract, deployMockContract} from 'ethereum-waffle';

const {expect} = chai;

describe('Treasury.sol', () => {
  let alice: Signer;
  let bob: Signer;

  let aliceAddress: string;
  let bobAddress: string;

  let collateral: MockContract;
  let treasury: Treasury;

  it('should deploy treasury', async () => {
    [alice, bob] = await ethers.getSigners();
    [aliceAddress, bobAddress] = await Promise.all([alice.getAddress(), bob.getAddress()]);
    collateral = await deployMockContract(alice, ERC20Artifact.abi);
    treasury = await deploy1(alice, TreasuryFactory, collateral.address);
  });

  it('should deposit all unreserved funds', async () => {
    await collateral.mock.balanceOf.returns(200);
    await treasury.deposit(aliceAddress, aliceAddress);
    await treasury.lock(aliceAddress, 200);
    const lockedBalance = await treasury.balanceOf(aliceAddress, aliceAddress);
    expect(lockedBalance.toNumber()).to.eq(200);
  });

  it('should release funds from market', async () => {
    await collateral.mock.transfer.returns(true);
    await collateral.mock.balanceOf.returns(100);
    await treasury.release(aliceAddress, bobAddress, 100);

    const lockedBalance = await treasury.balanceOf(aliceAddress, aliceAddress);
    expect(lockedBalance.toNumber()).to.eq(100);
  });
});
