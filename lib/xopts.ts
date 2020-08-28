import {ReadOnlyContracts, ReadWriteContracts} from './contracts';

import {Addresses, mustResolveAddresses} from './addresses';
import {BTCAmount, MonetaryAmount, Tether} from './monetary';
import {Signer, SignerOrProvider, Optional} from './core';
import {GlobalActions} from './actions/global';

import {
  OptionsReadWriteActions,
  ContractsOptionsReadWriteActions
} from './actions/options/read-write';

import {
  OptionsReadOnlyActions,
  ContractsOptionsReadOnlyActions
} from './actions/options/read-only';

import {Factory} from './actions/factory';

export type OptionActions<T extends SignerOrProvider> = T extends Signer
  ? OptionsReadWriteActions
  : OptionsReadOnlyActions;

export type FactoryActions<T extends SignerOrProvider> = T extends Signer
  ? Factory
  : null;

export class XOpts<T extends SignerOrProvider> implements GlobalActions {
  constructor(
    readonly addresses: Addresses,
    readonly readOnlyContracts: ReadOnlyContracts,
    readonly options: OptionActions<T> // readonly factory: FactoryActions<T>
  ) {}

  async totalLiquidity(): Promise<MonetaryAmount<Tether>> {
    const rawAmount = await this.readOnlyContracts.totalLiquidity();
    const tether = new Tether(this.readOnlyContracts.collateral.address);
    return new MonetaryAmount(tether, rawAmount.toString());
  }

  async optionMarketsCount(): Promise<number> {
    const options = await this.readOnlyContracts.listOptions();
    return options.length;
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

    const roContracts = await ReadOnlyContracts.load(addresses, provider);
    if (provider instanceof Signer) {
      // type checker does not seem to understand that in this branch
      // OptionActions<T> === OptionsReadWriteActions, hence the need for casting
      const contracts = await ReadWriteContracts.load(addresses, provider);
      const optionActions: OptionsReadWriteActions = new ContractsOptionsReadWriteActions(
        contracts
      );
      return new XOpts(
        addresses,
        roContracts,
        optionActions as OptionActions<T>
      );
    } else {
      const optionActions: OptionsReadOnlyActions = new ContractsOptionsReadOnlyActions(
        roContracts
      );
      return new XOpts(
        addresses,
        roContracts,
        optionActions as OptionActions<T>
      );
    }
  }
}
