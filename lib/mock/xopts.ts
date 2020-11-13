import {OptionsReadOnlyActions} from '../actions/options/read-only';
import {OptionsReadWriteActions} from '../actions/options/read-write';
import {Addresses, Deployments} from '../addresses';
import {Signer, SignerOrProvider} from '../core';
import {BTCAmount, MonetaryAmount, Tether} from '../monetary';
import {OptionActions, XOpts} from '../xopts';
import {MockContractsOptionsReadOnlyActions} from './actions/options/read-only';
import {MockContractsOptionsReadWriteActions} from './actions/options/read-write';
import mockDb from './db.json';

export class MockXOpts<T extends SignerOrProvider> implements XOpts<T> {
  constructor(
    readonly addresses: Addresses,
    readonly options: OptionActions<T> // readonly factory: FactoryActions<T>
  ) {}

  totalLiquidity(): Promise<MonetaryAmount<Tether>> {
    return Promise.resolve(new MonetaryAmount(new Tether('0x'), 100, 6));
  }

  optionMarketsCount(): Promise<number> {
    return Promise.resolve(mockDb.options.length);
  }

  async bitcoinTransferredAmount(): Promise<BTCAmount> {
    return Promise.resolve(new BTCAmount(100, 6));
  }

  static async load<T extends SignerOrProvider>(
    provider: T,
    addresses?: Addresses
  ): Promise<XOpts<T>> {
    if (addresses === undefined) {
      addresses = Deployments.buidler;
    }

    if (provider instanceof Signer) {
      // type checker does not seem to understand that in this branch
      // OptionActions<T> === OptionsReadWriteActions, hence the need for casting
      const optionActions: OptionsReadWriteActions = new MockContractsOptionsReadWriteActions();
      return new MockXOpts(addresses, optionActions as OptionActions<T>);
    } else {
      const optionActions: OptionsReadOnlyActions = new MockContractsOptionsReadOnlyActions();
      return new MockXOpts(addresses, optionActions as OptionActions<T>);
    }
  }
}
