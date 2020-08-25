import {Option} from '../../option';
import {
  Currency,
  MonetaryAmount,
  ERC20,
  BTC,
  BaseExchangeRate,
  BaseMonetaryAmount
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
  ): Promise<MonetaryAmount<Collateral>>;

  getUserWritten<Underlying extends Currency, Collateral extends Currency>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Underlying>>;
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

    return rawResults.map((rawOption, i) => {
      const expiry = new Date(rawOption._expiryTime.toNumber() * 1000);
      const windowSize = rawOption._windowSize.toNumber() * 1000;
      const collateral = new ERC20(
        tokenNames[rawOption._collateral],
        rawOption._decimals.toNumber()
      );
      const rawStrikePrice = new Big(rawOption._strikePrice.toString());
      const strikePrice = new BaseExchangeRate(BTC, collateral, rawStrikePrice);
      return {
        expiry,
        windowSize,
        strikePrice,
        collateral,
        obligationAddress: obligationAddresses[i],
        address: rawOption._option,
        underlying: BTC
      };
    });
  }

  async getLiquidity<Underlying extends Currency, Collateral extends Currency>(
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Underlying>> {
    throw new Error('not implemented');
  } // TODO: check the liquidity amount

  async getUserSupply<Underlying extends Currency, Collateral extends Currency>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    const pair = await this.roContracts.getPair(option.address);
    const rawBalance = await pair.totalSupplied(user);
    return new BaseMonetaryAmount(
      option.collateral,
      new Big(rawBalance.toString())
    );
  }

  async getUserWritten<
    Underlying extends Currency,
    Collateral extends Currency
  >(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Underlying>> {
    const pair = await this.roContracts.getPair(option.obligationAddress);
    const obligations = await pair.totalWritten(user);
    return new BaseMonetaryAmount(
      option.underlying,
      new Big(obligations.toString())
    );
  }
}
