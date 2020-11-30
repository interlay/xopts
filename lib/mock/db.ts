import {Big} from 'big.js';
import {USDT} from '../constants';
import {
  BTC,
  Currency,
  ERC20,
  ExchangeRate,
  MonetaryAmount,
  Tether
} from '../monetary';
import mockDb from './db.json';
import {Option, Position} from '../types';

function loadMockOptions(): Array<Option<Currency, ERC20>> {
  return mockDb.options.map((rawOption) => {
    const expiry = new Date(rawOption.expiry);
    const windowSize = rawOption.windowSize;
    const collateral = new Tether(USDT.mainnet);
    const rawStrikePrice = new Big(10)
      .pow(collateral.decimals)
      .times(rawOption.strikePrice);
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
  });
}

export const options = loadMockOptions();

function loadMockPositions(): Array<Position<Currency, ERC20>> {
  return mockDb.positions.map((rawPosition) => {
    const option = options.find(
      (option) => option.address == rawPosition.option
    );
    if (!option) {
      throw new Error(`option ${rawPosition.option} not found`);
    }

    const writtenAmount = new MonetaryAmount(
      option.underlying,
      rawPosition.writtenAmount
    );
    const boughtAmount = new MonetaryAmount(
      option.underlying,
      rawPosition.boughtAmount
    );
    return {
      option,
      account: rawPosition.account,
      writtenAmount,
      boughtAmount
    };
  });
}

export const positions = loadMockPositions();
