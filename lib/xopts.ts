import {Signer} from 'ethers';
import {providers} from 'ethers';
import {ReadOnlyContracts, ReadWriteContracts} from './contracts';
import {Addresses, Deployments} from './addresses';
import {ExchangeRate, Currency, MonetaryAmount} from './monetary';

type SignerOrProvider = Signer | providers.Provider;

interface Option<From extends Currency, To extends Currency> {
  expiry: Date;
  from: From;
  to: To;
  strikePrice: ExchangeRate<From, To>;
  currentPrice: ExchangeRate<From, To>;
  liquidityFrom: MonetaryAmount<From>;
}

interface OptionsReadOnlyActions {
  list(): Promise<Array<Option<Currency, Currency>>>;
}

interface OptionsReadWriteActions extends OptionsReadOnlyActions {
  write(): Promise<void>;
}

class ContractsOptionsReadOnlyActions implements OptionsReadOnlyActions {
  constructor(private roContracts: ReadOnlyContracts) {}

  list() {
    return Promise.resolve([]);
  }
}

class ContractsOptionsReadWriteActions extends ContractsOptionsReadOnlyActions
  implements OptionsReadWriteActions {
  constructor(private contracts: ReadWriteContracts) {
    super(contracts);
  }

  async write() {}
}

type OptionActions<T extends SignerOrProvider> = T extends Signer
  ? OptionsReadWriteActions
  : OptionsReadOnlyActions;

export class XOpts<T extends SignerOrProvider> {
  constructor(readonly options: OptionActions<T>) {}

  static async load<T extends SignerOrProvider>(
    provider: T,
    addresses?: Addresses
  ): Promise<XOpts<T>> {
    if (addresses === undefined) {
      addresses = Deployments.ganache; // TODO: change this to testnet/mainnet later on
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
