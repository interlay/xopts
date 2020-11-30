import {Currency, ERC20, ExchangeRate, MonetaryAmount} from './monetary';

export interface Option<Underlying extends Currency, Collateral extends ERC20> {
  /**
   * Address of the option
   */
  readonly address: string;

  /**
   * Address of the associated obligation
   */
  readonly obligationAddress: string;

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

export interface Position<
  Underlying extends Currency,
  Collateral extends ERC20
> {
  /**
   * The underlying option of this position
   */
  option: Option<Underlying, Collateral>;

  /**
   * Account owning the position
   */
  account: string;

  /**
   * The total amount written for this position in terms of underlying asset
   */
  writtenAmount: MonetaryAmount<Underlying>;

  /**
   * The total amount bought for this position in terms of underlying asset
   */
  boughtAmount: MonetaryAmount<Underlying>;
}
