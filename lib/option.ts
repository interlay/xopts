import {ExchangeRate, Currency, Bitcoin, BTC, USDT, Tether} from './monetary';

export interface Option<
  Underlying extends Currency,
  Collateral extends Currency
> {
  readonly expiry: Date;
  readonly underlying: Underlying;
  readonly collateral: Collateral;
  readonly strikePrice: ExchangeRate<Underlying, Collateral>;
}

export class BitcoinTetherOption implements Option<Bitcoin, Tether> {
  public readonly underlying = BTC;
  public readonly collateral = USDT;
  constructor(
    readonly expiry: Date,
    readonly strikePrice: ExchangeRate<Bitcoin, Tether>
  ) {}
}
