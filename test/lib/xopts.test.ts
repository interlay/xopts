import {providers} from 'ethers';
import {VoidSigner} from 'ethers';

import FakeWeb3Provider from './helpers/FakeWeb3Provider';

import {XOpts} from '../../lib/xopts';
import {expect} from 'chai';

describe('XOpts', () => {
  describe('constructor', () => {
    it('should work with provider', async () => {
      const provider = new providers.Web3Provider(new FakeWeb3Provider());
      const xopts = await XOpts.load(provider);
      expect(xopts.options).to.have.property('list');
      // we have static typing for the following
      expect(xopts.options).to.not.have.property('write');
    });

    it('should work with signer', async () => {
      const signer = new VoidSigner('0x');
      const xopts = await XOpts.load(signer);
      expect(xopts.options).to.have.property('list');
      expect(xopts.options).to.have.property('write');
    });
  });
});
