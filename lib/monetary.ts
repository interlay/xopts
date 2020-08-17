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
    return 'bitcoin';
  }
}

export class Ethereum implements Currency {
  get decimals(): number {
    return ETHUnit.Wei;
  }

  get name(): string {
    return 'ethereum';
  }
}

export class ERC20 implements Currency {
  constructor(protected _name: string, protected _decimals: number = 18) {}

  get decimals(): number {
    return this._decimals;
  }

  get name(): string {
    return this._name;
  }
}

export class Tether extends ERC20 implements Currency {
  constructor() {
    super('tether', 6);
  }
}

export const BTC = new Bitcoin();
export const ETH = new Ethereum();
export const USDT = new Tether();

export interface MonetaryAmount<C extends Currency> {
  currency: C;

  toString(humanFriendly: boolean): string;
  toBig(decimals?: number): Big;
}

export abstract class BaseMonetaryAmount<C extends Currency>
  implements MonetaryAmount<C> {
  protected _amount: Big;

  constructor(protected _currency: C, amount: BigSource, decimals?: number) {
    decimals = decimals ?? _currency.decimals;
    amount = new Big(amount);
    const exponent = _currency.decimals - decimals;
    if (exponent > 0) {
      amount = amount.mul(new Big(10).pow(exponent));
    }
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
    let result = this._amount;
    if (exponent > 0) {
      result = result.div(new Big(10).pow(exponent));
    }
    return result;
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

  get currency(): C {
    return this._currency;
  }
}

export class BTCAmount extends BaseMonetaryAmount<Bitcoin> {
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

export class ETHAmount extends BaseMonetaryAmount<Ethereum> {
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

export class ERC20Amount extends BaseMonetaryAmount<ERC20> {}

export interface ExchangeRate<Base extends Currency, Counter extends Currency> {
  readonly base: Base;
  readonly counter: Counter;
  readonly rate: Big;
}

export class BaseExchangeRate<Base extends Currency, Counter extends Currency>
  implements ExchangeRate<Base, Counter> {
  constructor(
    readonly base: Base,
    readonly counter: Counter,
    readonly rate: Big
  ) {}
}

export class BitcoinTetherRate extends BaseExchangeRate<Bitcoin, Tether>
  implements ExchangeRate<Bitcoin, Tether> {
  constructor(readonly rate: Big) {
    super(BTC, USDT, rate);
  }
}
