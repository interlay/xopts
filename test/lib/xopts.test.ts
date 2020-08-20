import {providers, VoidSigner, utils} from 'ethers';

import FakeWeb3Provider from './helpers/FakeWeb3Provider';

import {Provider, Signer} from '../../lib/core';
import {XOpts} from '../../lib/xopts';
import {Deployments} from '../../lib/addresses';
import {expect} from 'chai';

const ZERO_ADDRESS = '0x' + '0'.repeat(40);
const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';

function encode(type: string, value: any): string {
  return utils.defaultAbiCoder.encode([type], [value]);
}

describe('XOpts', () => {
  describe('unit', () => {
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

    describe('globals', () => {
      let xopts: XOpts<Provider>;

      beforeEach(async () => {
        xopts = await XOpts.load(provider, addresses);
      });

      describe('totalLiquidity', () => {
        it('should return total USDT amount', async () => {
          web3Provider.register('eth_call', addresses.collateral, {
            to: addresses.optionFactory
          });
          web3Provider.register('eth_call', '0xfa', {to: addresses.collateral});
          const amount = await xopts.totalLiquidity();
          expect(amount.toString()).to.eq('250');
        });
      });

      describe('optionMarketsCount', () => {
        it('should return the number of options', async () => {
          const returnValue = encode('address[]', [ZERO_ADDRESS, DAI_ADDRESS]);
          web3Provider.register('eth_call', returnValue, {
            to: addresses.optionFactory
          });
          const count = await xopts.optionMarketsCount();
          expect(count).to.eq(2);
        });
      });
    });
  });

  // NOTE: tests here use JSON RPC through HTTP
  // the data is assumed to be the one populated by the testdata.js script
  describe('integration', () => {
    const web3URI = process.env.NODE_URL || 'http://localhost:8545';

    before(function () {
      if (!process.env.RUN_XOPTS_INTEGRATION) {
        this.skip();
      }
    });

    let xopts: XOpts<Signer>;

    beforeEach(async () => {
      const provider = new providers.JsonRpcProvider(web3URI);
      xopts = await XOpts.load(provider.getSigner());
    });

    describe('global', () => {
      describe('totalLiquidity', () => {
        it('should return the amount in USDT', async () => {
          const amount = await xopts.totalLiquidity();
          expect(amount.toBig(0).gt(1)).to.be.true;
        });
      });

      describe('optionMarketsCount', () => {
        it('should return the number of options', async () => {
          const count = await xopts.optionMarketsCount();
          expect(count).to.eq(3);
        });
      });
    });

    describe('options read-only', () => {
      describe('list', () => {
        it('should return a list of options', async () => {
          const options = await xopts.options.list();
          expect(options.length).to.eq(3);
          expect(options[0].windowSize).to.eq(2000000);
          expect(options[0].collateral.name).to.eq('Collateral');
          expect(options[0].underlying.name).to.eq('Bitcoin');
        });
      });
    });
  });
});
