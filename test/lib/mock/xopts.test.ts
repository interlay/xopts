import {expect} from 'chai';
import {providers, Signer, VoidSigner} from 'ethers';
import {Deployments} from '../../../lib/addresses';
import {XOpts} from '../../../lib/xopts';
import mockDb from '../../../lib/mock/db.json';
import {MockXOpts} from '../../../lib/mock/xopts';
import {createXOpts} from '../../../lib/xopts';

describe('MockXOpts', () => {
  describe('unit', () => {
    const addresses = Deployments.mock;
    const signer = new VoidSigner('0x');
    let provider: providers.Provider;

    describe('constructor', () => {
      it('should work with provider', async () => {
        const xopts = await createXOpts(provider, addresses);
        expect(xopts).to.be.instanceOf(MockXOpts);
        expect(xopts.options).to.have.property('list');
        // we have static typing for the following
        expect(xopts.options).to.not.have.property('write');
      });

      it('should work with signer', async () => {
        const xopts = await createXOpts(signer, addresses);
        expect(xopts.options).to.have.property('list');
        expect(xopts.options).to.have.property('write');
      });
    });

    describe('global functions', () => {
      let xopts: XOpts<Signer>;
      beforeEach(async () => {
        xopts = await createXOpts(new VoidSigner('0x'), addresses);
      });

      it('should return data from mock DB', async () => {
        expect(await xopts.optionMarketsCount()).to.eq(mockDb.options.length);
      });
    });

    describe('actions', () => {
      let xopts: XOpts<Signer>;
      beforeEach(async () => {
        xopts = await createXOpts(new VoidSigner('0x'), addresses);
      });

      it('should return data from mock DB', async () => {
        const options = await xopts.options.list();
        expect(options.length).to.eq(mockDb.options.length);
        expect(options[0].address).to.eq(mockDb.options[0].address);
      });
    });
  });
});
