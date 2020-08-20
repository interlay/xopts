import {Option} from '../../option';
import {
  Currency,
  MonetaryAmount,
  ERC20,
  BTC,
  BaseExchangeRate
} from '../../monetary';
import {ReadOnlyContracts} from '../../contracts';
import {Erc20Factory} from '../../../typechain/Erc20Factory';
import {Big} from 'big.js';

export interface OptionsReadOnlyActions {
  list(): Promise<Array<Option<Currency, Currency>>>;
  getLiquidity<Underlying extends Currency, Collateral extends Currency>(
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Underlying>>; // TODO: check the liquidity amount

  getUserSupply<Underlying extends Currency, Collateral extends Currency>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Underlying>>; // call the option contract

  getUserWritten<Underlying extends Currency, Collateral extends Currency>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>>; // call the oblication contract balanceObl
}

export class ContractsOptionsReadOnlyActions implements OptionsReadOnlyActions {
  constructor(private roContracts: ReadOnlyContracts) {}

  async fetchTokenNames(
    addresses: Array<string>
  ): Promise<Record<string, string>> {
    const uniqueAddresses: string[] = [];
    for (const address of addresses) {
      if (!uniqueAddresses.includes(address)) {
        uniqueAddresses.push(address);
      }
    }

    const names = await Promise.all(
      uniqueAddresses.map(async (addr) => {
        const collateral = Erc20Factory.connect(addr, this.roContracts.signer);
        return collateral.name();
      })
    );

    const result: Record<string, string> = {};

    for (let i = 0; i < names.length; i++) {
      result[uniqueAddresses[i]] = names[i];
    }

    return result;
  }

  async list(): Promise<Array<Option<Currency, Currency>>> {
    const obligationAddresses = await this.roContracts.listObligations();
    const rawResults = await Promise.all(
      obligationAddresses.map((addr) => this.roContracts.getDetails(addr))
    );

    const collateralAddresses = rawResults.map((r) => r._collateral);
    const tokenNames = await this.fetchTokenNames(collateralAddresses);

    return rawResults.map((rawOption) => {
      const expiry = new Date(rawOption._expiryTime.toNumber() * 1000);
      const windowSize = rawOption._windowSize.toNumber() * 1000;
      const collateral = new ERC20(
        tokenNames[rawOption._collateral],
        rawOption._decimals.toNumber()
      );
      const rawStrikePrice = new Big(rawOption._strikePrice.toString());
      const strikePrice = new BaseExchangeRate(BTC, collateral, rawStrikePrice);
      return {expiry, windowSize, strikePrice, collateral, underlying: BTC};
    });
  }

  async getLiquidity<Underlying extends Currency, Collateral extends Currency>(
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Underlying>> {
    throw new Error('not implemented');
  } // TODO: check the liquidity amount

  // NOTE: keep this splitted
  async getUserSupply<Underlying extends Currency, Collateral extends Currency>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Underlying>> {
    throw new Error('not implemented');
  } // call the option contract

  async getUserWritten<
    Underlying extends Currency,
    Collateral extends Currency
  >(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    throw new Error('not implemented');
  } // call the oblication contract balanceObl
  // NOTE: return single currency and provide facility to convert
}
