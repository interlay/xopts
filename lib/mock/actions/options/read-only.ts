import {Big} from 'big.js';
import {OptionsReadOnlyActions} from '../../../actions/options/read-only';
import {Option} from '../../../option';
import {
  Currency,
  ERC20,
  BTC,
  Tether,
  ExchangeRate,
  MonetaryAmount
} from '../../../monetary';
import mockDb from '../../db.json';
import {USDT} from '../../../constants';

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
    return Promise.resolve(
      mockDb.options.map((rawOption) => {
        const expiry = new Date(rawOption.expiry * 1000);
        const windowSize = rawOption.windowSize * 1000;
        const collateral = new Tether(USDT.mainnet);
        const rawStrikePrice = new Big(rawOption.strikePrice.toString());
        const strikePrice = new ExchangeRate(BTC, collateral, rawStrikePrice);
        return {
          expiry,
          windowSize,
          strikePrice,
          collateral,
          obligationAddress: rawOption.obligationAddress,
          address: rawOption.address,
          underlying: BTC
        };
      })
    );
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

  async estimatePremium<Collateral extends ERC20>(
    option: Option<Currency, Collateral>,
    amount: MonetaryAmount<Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    return new MonetaryAmount(
      option.collateral,
      amount.toBig().div(new Big(5))
    );
  }
}
