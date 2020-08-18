import {ReadOnlyContracts, ReadWriteContracts} from './contracts';

import Big from 'big.js';

import {Addresses, mustResolveAddresses} from './addresses';
import {BTCAmount} from './monetary';
import {Signer, SignerOrProvider} from './core';
import {GlobalActions} from './actions/global';

import {
  OptionsReadWriteActions,
  ContractsOptionsReadWriteActions
} from './actions/options/read-write';

import {
  OptionsReadOnlyActions,
  ContractsOptionsReadOnlyActions
} from './actions/options/read-only';

export type OptionActions<T extends SignerOrProvider> = T extends Signer
  ? OptionsReadWriteActions
  : OptionsReadOnlyActions;

export class XOpts<T extends SignerOrProvider> implements GlobalActions {
  constructor(readonly options: OptionActions<T>) {}

  async totalLiquidity(): Promise<Big> {
    throw new Error('not implemented');
  }

  async totalFeesEarned(): Promise<Big> {
    throw new Error('not implemented');
  }

  async optionMarketsCount(): Promise<number> {
    throw new Error('not implemented');
  }

  async bitcoinTransferredAmount(): Promise<BTCAmount> {
    throw new Error('not implemented');
  }

  static async load<T extends SignerOrProvider>(
    provider: T,
    addresses?: Addresses
  ): Promise<XOpts<T>> {
    if (addresses === undefined) {
      addresses = await mustResolveAddresses(provider);
    }

    if (provider instanceof Signer) {
      // type checker does not seem to understand that in this branch
      // OptionActions<T> === OptionsReadWriteActions, hence the need for casting
      const contracts = await ReadWriteContracts.load(addresses, provider);
      const optionActions: OptionsReadWriteActions = new ContractsOptionsReadWriteActions(
        contracts
      );
      return new XOpts(optionActions as OptionActions<T>);
    } else {
      const contracts = await ReadOnlyContracts.load(addresses, provider);
      const optionActions: OptionsReadOnlyActions = new ContractsOptionsReadOnlyActions(
        contracts
      );
      return new XOpts(optionActions as OptionActions<T>);
    }
  }
}
