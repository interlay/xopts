import {providers} from 'ethers';
import {VoidSigner} from 'ethers';

import FakeWeb3Provider from './helpers/FakeWeb3Provider';

import {XOpts} from '../../lib/xopts';
import {Deployments} from '../../lib/addresses';
import {expect} from 'chai';

describe('XOpts', () => {
  const addresses = Deployments.ganache;
  let web3Provider: FakeWeb3Provider;
  let provider: providers.Provider;

  beforeEach(() => {
    web3Provider = new FakeWeb3Provider();
    provider = new providers.Web3Provider(web3Provider);

    web3Provider.register('net_version', '1234', {n: 10});
    web3Provider.register('eth_chainId', '1234', {n: 10});
  });

  describe('constructor', () => {
    it('should work with provider', async () => {
      const xopts = await XOpts.load(provider, addresses);
      expect(xopts.options).to.have.property('list');
      // we have static typing for the following
      expect(xopts.options).to.not.have.property('write');
    });

    it('should work with signer', async () => {
      const signer = new VoidSigner('0x');
      const xopts = await XOpts.load(signer, addresses);
      expect(xopts.options).to.have.property('list');
      expect(xopts.options).to.have.property('write');
    });
  });

  describe('global', () => {
    describe('totalLiquidity', () => {
      it('should return total USDT amount', async () => {
        web3Provider.register('eth_call', addresses.collateral, {
          to: addresses.optionFactory
        });
        web3Provider.register('eth_call', '0xfa', {to: addresses.collateral});
        const xopts = await XOpts.load(provider, addresses);
        const amount = await xopts.totalLiquidity();
        expect(amount.toString()).to.eq('250');
      });
    });
  });
});
