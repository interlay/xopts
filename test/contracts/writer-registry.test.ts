import chai from 'chai';
import {ethers} from 'hardhat';
import {Signer, constants} from 'ethers';
import {deploy0} from '../../lib/contracts';
import {WriterRegistry} from '../../typechain/WriterRegistry';
import {WriterRegistryFactory} from '../../typechain';
import {Script, ErrorCode} from '../../lib/constants';
import * as bitcoin from 'bitcoinjs-lib';

const {expect} = chai;

describe('WriterRegistry.sol', () => {
  let alice: Signer;
  let aliceAddress: string;
  let registry: WriterRegistry;

  it('should deploy writer registry', async () => {
    [alice] = await ethers.getSigners();
    aliceAddress = await alice.getAddress();
    registry = await deploy0(alice, WriterRegistryFactory);
  });

  it('should fail to set an empty address', async () => {
    const result = registry.setBtcAddress(constants.AddressZero, Script.p2sh);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_NO_BTC_HASH);
  });

  it('should set an address', async () => {
    const pair = bitcoin.ECPair.makeRandom();
    const payment = bitcoin.payments.p2pkh({pubkey: pair.publicKey});
    const btcAddress = payment.address!;
    const btcHash = payment.hash!.toString('hex');
    await registry.setBtcAddress(`0x${btcHash}`, Script.p2pkh);
    const result = await registry.getBtcAddress(aliceAddress);
    expect(result.format).to.eq(Script.p2pkh);
    expect(result.btcHash).to.eq(`0x${btcHash}`);
    const output = bitcoin.payments.p2pkh({
      hash: Buffer.from(result.btcHash.substr(2), 'hex')
    });
    expect(output.address!).to.eq(btcAddress);
  });
});
