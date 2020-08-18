import Big from 'big.js';
import {BTCAmount} from '../monetary';

export interface GlobalActions {
  totalLiquidity(): Promise<Big>; // call treasury contract, TODO: decide on the type, maybe MonetaryAmount<USDT>?
  totalFeesEarned(): Promise<Big>; // TODO: discuss design
  optionMarketsCount(): Promise<number>; // call option factory
  bitcoinTransferredAmount(): Promise<BTCAmount>; // TODO: update BTC referree contract to keep track of this
}
