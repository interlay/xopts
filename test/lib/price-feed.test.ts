import chai from 'chai';
import {CoinbaseFeed} from '../../lib/feed';
import nock from 'nock';

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
});
