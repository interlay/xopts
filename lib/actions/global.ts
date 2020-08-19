import {BTCAmount, USDTAmount} from '../monetary';

export interface GlobalActions {
  totalLiquidity(): Promise<USDTAmount>; // call treasury contract
  // totalFeesEarned(): Promise<Big>; // NOTE: keep this for graphql
  optionMarketsCount(): Promise<number>; // call option factory
  bitcoinTransferredAmount(): Promise<BTCAmount>; // TODO: update BTC referree contract to keep track of this
}
