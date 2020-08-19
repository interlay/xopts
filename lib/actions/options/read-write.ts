import {Option} from '../../option';
import {Currency, MonetaryAmount} from '../../monetary';
import {BtcAddress, ReadWriteContracts} from '../../contracts';
import {
  OptionsReadOnlyActions,
  ContractsOptionsReadOnlyActions
} from './read-only';

export interface OptionsReadWriteActions extends OptionsReadOnlyActions {
  write<Underlying extends Currency, Collateral extends Currency>(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Underlying>,
    btcAddress: BtcAddress
  ): Promise<void>;

  buy<Underlying extends Currency, Collateral extends Currency>(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Underlying>
  ): Promise<void>;

  create<Underlying extends Currency, Collateral extends Currency>(
    option: Option<Underlying, Collateral>
  ): Promise<void>;
}

export class ContractsOptionsReadWriteActions
  extends ContractsOptionsReadOnlyActions
  implements OptionsReadWriteActions {
  constructor(private contracts: ReadWriteContracts) {
    super(contracts);
  }

  async write<Underlying extends Currency, Collateral extends Currency>(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Underlying>,
    btcAddress: BtcAddress
  ) {
    return;
  }

  async buy<Underlying extends Currency, Collateral extends Currency>(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Underlying>
  ) {
    return;
  }

  async create<Underlying extends Currency, Collateral extends Currency>(
    option: Option<Underlying, Collateral>
  ) {
    return;
  }
}
