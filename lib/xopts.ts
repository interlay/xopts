import {ReadOnlyContracts, ReadWriteContracts} from './contracts';

import {Addresses, Deployments, mustResolveAddresses} from './addresses';
import {BTCAmount, MonetaryAmount, Tether} from './monetary';
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

import {Factory} from './actions/factory';
import {MockXOpts} from './mock/xopts';
import {
  DefaultPositionActions,
  PositionActions as IPositionActions
} from './actions/positions';

export type OptionActions<T extends SignerOrProvider> = T extends Signer
  ? OptionsReadWriteActions
  : OptionsReadOnlyActions;

export type FactoryActions<T extends SignerOrProvider> = T extends Signer
  ? Factory
  : null;

export type PositionActions<T extends SignerOrProvider> = T extends Signer
  ? IPositionActions
  : null;

export interface XOpts<T extends SignerOrProvider> extends GlobalActions {
  readonly addresses: Addresses;
  readonly options: OptionActions<T>;
  readonly positions: PositionActions<T>;

  totalLiquidity(): Promise<MonetaryAmount<Tether>>;
  optionMarketsCount(): Promise<number>;
  bitcoinTransferredAmount(): Promise<BTCAmount>;
}

export class DefaultXOpts<T extends SignerOrProvider> implements GlobalActions {
  constructor(
    readonly addresses: Addresses,
    private readonly readOnlyContracts: ReadOnlyContracts,
    readonly options: OptionActions<T>,
    readonly positions: PositionActions<T>
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
      const rwContracts = await ReadWriteContracts.load(addresses, provider);
      const optionActions: OptionsReadWriteActions = new ContractsOptionsReadWriteActions(
        rwContracts
      );
      return new DefaultXOpts(
        addresses,
        roContracts,
        optionActions as OptionActions<T>,
        new DefaultPositionActions() as PositionActions<T>
      );
    } else {
      const optionActions: OptionsReadOnlyActions = new ContractsOptionsReadOnlyActions(
        roContracts
      );
      return new DefaultXOpts(
        addresses,
        roContracts,
        optionActions as OptionActions<T>,
        null as PositionActions<T>
      );
    }
  }
}

export async function createXOpts<T extends SignerOrProvider>(
  provider: T,
  addresses?: Addresses
): Promise<XOpts<T>> {
  if (
    addresses &&
    (addresses.collateral == Deployments.mock.collateral ||
      addresses.collateral == Deployments.mockRealistic.collateral)
  ) {
    return MockXOpts.load(provider, addresses);
  }
  return DefaultXOpts.load(provider, addresses);
}
