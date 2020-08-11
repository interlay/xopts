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
    private _name: string;
    private _decimals: number;

    constructor(name: string, decimals: number = 18) {
        this._name = name;
        this._decimals = decimals;
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

export class MonetaryAmount<T extends ICurrency> implements IMonetaryAmount {
    protected _currency: T;
    protected _amount: Big;

    constructor(currency: T, amount: BigSource, decimals?: number) {
        decimals = decimals ?? currency.decimals;
        amount = new Big(amount);
        const exponent = currency.decimals - decimals;
        if (exponent > 0) {
            amount = amount.mul(new Big(10).pow(exponent));
        }
        this._currency = currency;
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

    get currency(): T {
        return this._currency;
    }
}


export class BTCAmount extends MonetaryAmount<Bitcoin> {
    constructor(amount: BigSource, decimals?: number) {
        super(BTC, amount, decimals);
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
}
