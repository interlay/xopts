import Big from 'big.js';
import {BigSource} from 'big.js';

export interface Currency {
  decimals: number;
  name: string;
}

export enum BTCUnit {
  Btc = 0,
  MSatoshi = 5,
  Satoshi = 8
}

export enum ETHUnit {
  Ether = 0,
  GWei = 9,
  Wei = 18
}

export class Bitcoin implements Currency {
  get decimals(): number {
    return BTCUnit.Satoshi;
  }

  get name(): string {
    return 'Bitcoin';
  }
}

export class Ethereum implements Currency {
  get decimals(): number {
    return ETHUnit.Wei;
  }

  get name(): string {
    return 'Ethereum';
  }
}

export class ERC20 implements Currency {
  constructor(
    readonly name: string,
    readonly address: string,
    readonly decimals: number = 18
  ) {}
}

export class Tether extends ERC20 implements Currency {
  constructor(address: string) {
    super('Tether', address, 6);
  }
}

export const BTC = new Bitcoin();
export const ETH = new Ethereum();

export class MonetaryAmount<C extends Currency> {
  protected _amount: Big;

  constructor(readonly currency: C, amount: BigSource, decimals?: number) {
    decimals = decimals ?? currency.decimals;
    amount = new Big(amount);
    const exponent = currency.decimals - decimals;
    amount = amount.mul(new Big(10).pow(exponent));
    this._amount = amount;
  }

  toString(humanFriendly = false): string {
    if (!humanFriendly) {
      return this._amount.toString();
    }
    const amount = this.toBig(0);
    // FIXME: would be better to format directly to locale string
    // but after conversion to 0 decimals, amount should be small
    // enough to fit in normal number
    return parseFloat(amount.toString()).toLocaleString();
  }

  toBig(decimals: number = this.currency.decimals): Big {
    const exponent = this.currency.decimals - decimals;
    return this._amount.div(new Big(10).pow(exponent));
  }

  add(amount: this): this {
    if (!this.isSameCurrency(amount)) {
      throw new Error(
        `cannot add ${this.currency.name} and ${amount.currency.name}`
      );
    }
    return this.withAmount(this._amount.add(amount._amount));
  }

  sub(amount: this): this {
    if (!this.isSameCurrency(amount)) {
      throw new Error(
        `cannot subtract ${this.currency.name} and ${amount.currency.name}`
      );
    }
    return this.withAmount(this._amount.sub(amount._amount));
  }

  protected isSameCurrency(amount: this): boolean {
    return this.currency.name === amount.currency.name;
  }

  mul(multiplier: BigSource): this {
    return this.withAmount(this._amount.mul(multiplier));
  }

  div(divisor: BigSource): this {
    return this.withAmount(this._amount.div(divisor));
  }

  // NOTE: needs override if constructor is overriden
  withAmount(amount: BigSource): this {
    const Cls = this.constructor as new (
      currency: Currency,
      amount: BigSource
    ) => this;
    return new Cls(this.currency, amount);
  }
}

export class BTCAmount extends MonetaryAmount<Bitcoin> {
  constructor(amount: BigSource, decimals?: number) {
    super(BTC, amount, decimals);
  }

  withAmount(amount: BigSource): this {
    const Cls = this.constructor as new (amount: BigSource) => this;
    return new Cls(amount);
  }

  static fromSatoshi(amount: BigSource): BTCAmount {
    return new BTCAmount(amount, BTCUnit.Satoshi);
  }

  static fromMSatoshi(amount: BigSource): BTCAmount {
    return new BTCAmount(amount, BTCUnit.MSatoshi);
  }

  static fromBTC(amount: BigSource): BTCAmount {
    return new BTCAmount(amount, BTCUnit.Btc);
  }

  toSatoshi(): Big {
    return this.toBig(BTCUnit.Satoshi);
  }

  toMSatoshi(): Big {
    return this.toBig(BTCUnit.MSatoshi);
  }

  toBTC(): Big {
    return this.toBig(BTCUnit.Btc);
  }
}

export class ETHAmount extends MonetaryAmount<Ethereum> {
  constructor(amount: BigSource, decimals?: number) {
    super(ETH, amount, decimals);
  }

  withAmount(amount: BigSource): this {
    const Cls = this.constructor as new (amount: BigSource) => this;
    return new Cls(amount);
  }

  static fromWei(amount: BigSource): ETHAmount {
    return new ETHAmount(amount, ETHUnit.Wei);
  }

  static fromGWei(amount: BigSource): ETHAmount {
    return new ETHAmount(amount, ETHUnit.GWei);
  }

  static fromEther(amount: BigSource): ETHAmount {
    return new ETHAmount(amount, ETHUnit.Ether);
  }

  toWei(): Big {
    return this.toBig(ETHUnit.Wei);
  }

  toGWei(): Big {
    return this.toBig(ETHUnit.GWei);
  }

  toEther(): Big {
    return this.toBig(ETHUnit.Ether);
  }
}

export class ERC20Amount extends MonetaryAmount<ERC20> {}

export class ExchangeRate<Base extends Currency, Counter extends Currency> {
  /**
   *
   * @param base Base currency, BTC in BTC/USDT
   * @param counter Counter currency, USDT in BTC/USDT
   * @param rate Exchange rate: amount of `counter` needed per unit of `base`
   *             The amount is expressed with the same number of decimals as `counter`
   */
  constructor(
    readonly base: Base,
    readonly counter: Counter,
    readonly rate: Big
  ) {}

  toBase(amount: MonetaryAmount<Counter>): MonetaryAmount<Base> {
    const converted = amount
      .toBig(this.base.decimals + this.counter.decimals)
      .div(this.rate);
    return new MonetaryAmount(this.base, converted);
  }

  toCounter(amount: MonetaryAmount<Base>): MonetaryAmount<Counter> {
    const converted = amount.toBig(0).mul(this.rate);
    return new MonetaryAmount(this.counter, converted);
  }
}
