import chai from 'chai';
import {CoinbaseFeed} from '../../lib/feed';
import nock from 'nock';
import chaiAsPromised from 'chai-as-promised';
import {ErrorCode} from '../../lib/constants';

chai.use(chaiAsPromised);
const {expect} = chai;

global.fetch = require('node-fetch');

describe('Price Feed', () => {
  it('should fetch coinbase spot price', async () => {
    nock('https://api.coinbase.com')
      .get('/v2/prices/spot?currency=GBP')
      .reply(200, {
        data: {
          base: 'BTC',
          currency: 'GBP',
          amount: '8893.89058866'
        }
      });

    const feed = new CoinbaseFeed('GBP');
    const amount = await feed.getSpotPrice();
    expect(amount).to.eq(8893.89058866);
  });

  it('should throw if not ok', async () => {
    nock('https://api.coinbase.com')
      .get('/v2/prices/spot?currency=GBP')
      .reply(500);

    const feed = new CoinbaseFeed('GBP');
    const result = feed.getSpotPrice();
    await expect(result).to.be.rejectedWith(ErrorCode.ERR_GET_SPOT_PRICE);
  });
});
