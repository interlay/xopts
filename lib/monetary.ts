import Big from 'big.js';
import { BigSource } from 'big.js';


export interface ICurrency {
    decimals: number;
    name: String;
}

export enum BTCUnit {
    Btc = 0,
    MSatoshi = 5,
    Satoshi = 8,
}

export enum ETHUnit {
    Ether = 0,
    GWei = 9,
    Wei = 18,
}


class Bitcoin implements ICurrency {
    get decimals() {
        return BTCUnit.Satoshi;
    }

    get name() {
        return 'bitcoin';
    }
}

class Ethereum implements ICurrency {
    get decimals() {
        return ETHUnit.Wei;
    }

    get name() {
        return 'ethereum';
    }
}

export const BTC = new Bitcoin();
export const ETH = new Ethereum();

export class ERC20 implements ICurrency {
    constructor(protected _name: string, protected _decimals: number = 18) {
    }

    get decimals() {
        return this._decimals;
    }

    get name() {
        return this._name;
    }
}


export interface IMonetaryAmount {
    currency: ICurrency;

    toString(humanFriendly: boolean): String;
    toBig(decimals?: number): Big;
}

export abstract class MonetaryAmount<T extends ICurrency> implements IMonetaryAmount {
    protected _amount: Big;

    constructor(protected _currency: T, amount: BigSource, decimals?: number) {
        decimals = decimals ?? _currency.decimals;
        amount = new Big(amount);
        const exponent = _currency.decimals - decimals;
        if (exponent > 0) {
            amount = amount.mul(new Big(10).pow(exponent));
        }
        this._amount = amount;
    }

    toString(humanFriendly: boolean = false): string {
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
            throw new Error(`cannot add ${this.currency.name} and ${amount.currency.name}`);
        }
        return this.withAmount(this._amount.add(amount._amount));
    }

    sub(amount: this): this {
        if (!this.isSameCurrency(amount)) {
            throw new Error(`cannot subtract ${this.currency.name} and ${amount.currency.name}`);
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
        const Cls = this.constructor as new (currency: ICurrency, amount: BigSource) => this;
        return new Cls(this.currency, amount);
    }

    get currency(): T {
        return this._currency;
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

export class ERC20Amount extends MonetaryAmount<ERC20> {
    withAmount(amount: BigSource): this {
        const Cls = this.constructor as new (currency: ICurrency, amount: BigSource) => this;
        return new Cls(this.currency, amount);
    }
}
