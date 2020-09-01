import {Option} from '../../option';
import {Currency, MonetaryAmount, ERC20} from '../../monetary';
import {BtcAddress, ReadWriteContracts} from '../../contracts';
import {OptionsReadOnlyActions, ContractsOptionsReadOnlyActions} from './read-only';

const defaultDeadline: number = 3_600 * 6; // 6 hours max

function makeDefaultDeadline(): number {
  const nowSeconds = Math.floor(new Date().getTime() / 1000);
  return nowSeconds + defaultDeadline;
}

export interface OptionsReadWriteActions extends OptionsReadOnlyActions {
  write<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Collateral>,
    btcAddress: BtcAddress
  ): Promise<void>;

  buy<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>,
    amountOut: MonetaryAmount<Collateral>,
    amountInMax: MonetaryAmount<Collateral>
  ): Promise<void>;
}

export class ContractsOptionsReadWriteActions extends ContractsOptionsReadOnlyActions
  implements OptionsReadWriteActions {
  constructor(private contracts: ReadWriteContracts) {
    super(contracts);
  }

  async write<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Collateral>,
    btcAddress: BtcAddress
  ) {
    const pair = await this.contracts.getPair(option.address);
    const premium = await this.estimatePremium(option, amount);
    await pair.write(premium.toString(), amount.toString(), btcAddress);
  }

  async buy<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>,
    amountOut: MonetaryAmount<Collateral>,
    amountInMax: MonetaryAmount<Collateral>
  ) {
    const pair = await this.contracts.getPair(option.address);
    const deadline = makeDefaultDeadline();
    await pair.buyOptions(amountOut.toString(), amountInMax.toString(), deadline);
  }
}
