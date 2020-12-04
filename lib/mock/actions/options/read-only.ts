import {Big} from 'big.js';
import {OptionsReadOnlyActions} from '../../../actions/options/read-only';
import {Currency, ERC20, MonetaryAmount} from '../../../monetary';
import {Option} from '../../../types';
import {options as mockOptions} from '../../db';

export class MockContractsOptionsReadOnlyActions
  implements OptionsReadOnlyActions {
  async fetchTokenNames(
    _addresses: Array<string>
  ): Promise<Record<string, string>> {
    return Promise.resolve({
      address: 'ETHBTC'
    });
  }

  list(): Promise<Array<Option<Currency, ERC20>>> {
    return Promise.resolve(mockOptions);
  }

  async getLiquidity<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Underlying>> {
    return new MonetaryAmount(option.underlying, 20, 0);
  }

  async getUserSupply<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    return new MonetaryAmount(option.collateral, 50, 0);
  }

  async getUserWritten<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    return new MonetaryAmount(option.collateral, 30, 0);
  }

  async getUserBalance<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    return new MonetaryAmount(option.collateral, Math.random() * 200, 0);
  }

  async getUserPosition<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    return new MonetaryAmount(
      option.collateral,
      Math.random() * 200 - Math.random() * 200
    );
  }

  async estimatePremium<Collateral extends ERC20>(
    option: Option<Currency, Collateral>,
    amount: MonetaryAmount<Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    return new MonetaryAmount(
      option.collateral,
      amount.toBig().div(new Big(5))
    );
  }

  async estimatePoolBuyPrice<
    Underlying extends Currency,
    Collateral extends ERC20
  >(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    return new MonetaryAmount(option.collateral, 100, 0);
  }

  async estimatePoolSellPrice<
    Underlying extends Currency,
    Collateral extends ERC20
  >(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    return new MonetaryAmount(option.collateral, 100, 0);
  }
}
