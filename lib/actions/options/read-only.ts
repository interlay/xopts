import {Option} from '../../option';
import {Currency, MonetaryAmount} from '../../monetary';
import {ReadOnlyContracts} from '../../contracts';

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

  async list(): Promise<Array<Option<Currency, Currency>>> {
    return [];
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
