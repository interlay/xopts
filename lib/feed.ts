export interface BitcoinPriceFeed {
  getSpotPrice(): Promise<number>;
}

// https://developers.coinbase.com/docs/wallet/guides/price-data
export class CoinbaseFeed implements BitcoinPriceFeed {
  url: string;

  constructor(currency: string) {
    this.url = `https://api.coinbase.com/v2/prices/spot?currency=${currency}`;
  }

  async getSpotPrice(): Promise<number> {
    const response = await global.fetch(this.url);
    const body = await response.json();
    return parseFloat(body.data.amount);
  }
}
