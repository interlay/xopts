import {ExchangeRate, Currency} from './monetary';

export interface Option<
  Underlying extends Currency,
  Collateral extends Currency
> {
  /**
   * Expiry date of the given option
   */
  readonly expiry: Date;

  /**
   * Window size up to which the option can be exercised
   * after it has expired, expressed in ms
   */
  readonly windowSize: number;

  /**
   * Strike price of the option expressed as an exchange rate
   * from underlying to collateral
   */
  readonly strikePrice: ExchangeRate<Underlying, Collateral>;

  /**
   * Underlying asset of the option, e.g. BTC
   */
  readonly underlying: Underlying;

  /**
   * Collateral used for the option, e.g. USDT
   */
  readonly collateral: Collateral;
}
