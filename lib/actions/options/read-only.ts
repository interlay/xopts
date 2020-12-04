import {Big} from 'big.js';
import {Erc20Factory} from '../../../typechain/Erc20Factory';
import {Ierc20Factory} from '../../../typechain/Ierc20Factory';
import {ReadOnlyContracts} from '../../contracts';
import {
  ExchangeRate,
  BTC,
  Currency,
  ERC20,
  MonetaryAmount
} from '../../monetary';
import {Option} from '../../types';
import {quote} from '../../uniswap';

Big.PE = 40;

export interface OptionsReadOnlyActions {
  /**
   * Lists all the options currently available
   */
  list(): Promise<Array<Option<Currency, ERC20>>>;

  /**
   * Returns the total liquidity for the given option
   *
   * @param option Options for which to get liquidity
   */
  getLiquidity<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Underlying>>;

  /**
   * Returns the current supply of `option` collateral for `user`
   *
   * @param user User for whom to get the supply
   * @param option Option for which to get collateral supply
   */
  getUserSupply<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>>;

  /**
   * Returns the total amount of `option` written by `user`
   *
   * @param user Users for whom to get the amount written
   * @param option Option for which to get amount written
   */
  getUserWritten<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>>;

  /**
   * Returns the total amount of `option` currently held by `user`
   *
   * @param user The user whose balance to check
   * @param option Option for which to check balance
   * @returns The user's balance of option tokens
   */
  getUserBalance<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>>;

  /**
   * Gets the net position of the user (negative for obligations -
   * short position; positive for put options - long position)
   * @param user User whose position to calculate
   * @param option Option whose pair's position to check
   * @returns Net position, equal to (options held - obligations held)
   */
  getUserPosition<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>>;

  /**
   * Returns the premium for `option` in unit of collateral when writing `amount` of underlying
   *
   * @param option the option for which to compute premium
   * @param amount amount of underlying tokens
   * @returns the approximate premium that the user will receive
   */
  estimatePremium<Collateral extends ERC20>(
    option: Option<Currency, Collateral>,
    amount: MonetaryAmount<Collateral>
  ): Promise<MonetaryAmount<Collateral>>;

  /**
   * Returns the amount of collateral necessary for a uniswap swap
   * for the given option.
   *
   * @param option Option whose pool to check
   * @param amount Amount of option desired to be bought
   * @returns Amount of collateral currently necessary to perform the swap
   */
  estimatePoolBuyPrice<Collateral extends ERC20>(
    option: Option<Currency, Collateral>,
    amount: MonetaryAmount<Collateral>
  ): Promise<MonetaryAmount<Collateral>>;

  /**
   * Returns the amount of collateral that will be obtained from
   * a uniswap swap with the given option.
   *
   * @param option Option whose pool to check
   * @param amount Amount of option desired to be sold
   * @returns Amount of collateral currently obtainable from such a swap
   */
  estimatePoolSellPrice<Collateral extends ERC20>(
    option: Option<Currency, Collateral>,
    amount: MonetaryAmount<Collateral>
  ): Promise<MonetaryAmount<Collateral>>;
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

  async list(): Promise<Array<Option<Currency, ERC20>>> {
    const obligationAddresses = await this.roContracts.listOptions();
    const rawResults = await Promise.all(
      obligationAddresses.map((addr) =>
        this.roContracts.getPair(addr).then((p) => p.getDetails())
      )
    );

    const collateralAddresses = rawResults.map((r) => r._collateral);
    const tokenNames = await this.fetchTokenNames(collateralAddresses);

    return rawResults.map((rawOption, i) => {
      const expiry = new Date(rawOption._expiryTime.toNumber() * 1000);
      const windowSize = rawOption._windowSize.toNumber() * 1000;
      const collateral = new ERC20(
        tokenNames[rawOption._collateral],
        rawOption._collateral,
        rawOption._decimals.toNumber()
      );
      const rawStrikePrice = new Big(rawOption._strikePrice.toString());
      const strikePrice = new ExchangeRate(BTC, collateral, rawStrikePrice);
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

  async getLiquidity<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Underlying>> {
    throw new Error('not implemented');
  } // TODO: check the liquidity amount

  async getUserSupply<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    const pair = await this.roContracts.getPair(option.address);
    const rawBalance = await pair.totalSupplied(user);
    return new MonetaryAmount(option.collateral, rawBalance.toString());
  }

  async getUserWritten<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    const pair = await this.roContracts.getPair(option.obligationAddress);
    const obligations = await pair.totalWritten(user);
    return new MonetaryAmount(option.collateral, obligations.toString());
  }

  async getUserBalance<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    const pair = await this.roContracts.getPair(option.address);
    const balance = await pair.optionsBalance(user);
    return new MonetaryAmount(option.collateral, balance.toString());
  }

  async getUserPosition<Underlying extends Currency, Collateral extends ERC20>(
    user: string,
    option: Option<Underlying, Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    const pair = await this.roContracts.getPair(option.address);
    const optionBalance = await pair.optionsBalance(user);
    const obligationBalance = await pair.totalWritten(user);
    return new MonetaryAmount(
      option.collateral,
      optionBalance.sub(obligationBalance).toString()
    );
  }

  async estimatePremium<Collateral extends ERC20>(
    option: Option<Currency, Collateral>,
    amount: MonetaryAmount<Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    const pair = await this.roContracts.getPair(option.address);
    const pairAddress = await pair.getPairAddress();
    const signer = this.roContracts.signer;
    const premiumERC = Ierc20Factory.connect(option.collateral.address, signer);
    const optionERC = Ierc20Factory.connect(option.address, signer);

    const result = await quote(
      pairAddress,
      optionERC,
      premiumERC,
      amount.toString()
    );

    return new MonetaryAmount(option.collateral, result.toString());
  }

  async estimatePoolBuyPrice<
    Underlying extends Currency,
    Collateral extends ERC20
  >(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    const pair = await this.roContracts.getPair(option.address);
    const quote = await pair.getOptionInPrice(amount.toString());
    return new MonetaryAmount(option.collateral, quote.toString());
  }

  async estimatePoolSellPrice<
    Underlying extends Currency,
    Collateral extends ERC20
  >(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Collateral>
  ): Promise<MonetaryAmount<Collateral>> {
    const pair = await this.roContracts.getPair(option.address);
    const quote = await pair.getOptionOutPrice(amount.toString());
    return new MonetaryAmount(option.collateral, quote.toString());
  }
}
