import {Big} from 'big.js';
import {Option} from '../../types';
import {Currency, MonetaryAmount, ERC20} from '../../monetary';
import {BtcAddress, ReadWriteContracts} from '../../contracts';
import {
  OptionsReadOnlyActions,
  ContractsOptionsReadOnlyActions
} from './read-only';
import {ConfirmationNotifier} from '../../notifier';

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
  ): Promise<ConfirmationNotifier>;

  sell<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>,
    amountIn: MonetaryAmount<Collateral>,
    amountOutMin: MonetaryAmount<Collateral>
  ): Promise<ConfirmationNotifier>;
}

export class ContractsOptionsReadWriteActions
  extends ContractsOptionsReadOnlyActions
  implements OptionsReadWriteActions {
  constructor(private contracts: ReadWriteContracts) {
    super(contracts);
  }

  async write<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>,
    amount: MonetaryAmount<Collateral>,
    btcAddress: BtcAddress
  ): Promise<void> {
    const pair = await this.contracts.getPair(option.address);
    const premium = await this.estimatePremium(option, amount);
    pair.write(premium.toString(), amount.toString(), btcAddress);
  }

  async buy<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>,
    amountOut: MonetaryAmount<Collateral>,
    amountInMax: MonetaryAmount<Collateral>
  ): Promise<ConfirmationNotifier> {
    const hasApproved = await this.contracts.checkAllowanceCollateral();
    if (!hasApproved) {
      await this.contracts.approveMaxCollateral();
    }

    const pair = await this.contracts.getPair(option.address);
    const deadline = makeDefaultDeadline();
    Big.PE = 40;
    return pair.buyOptions(
      amountOut.toString(),
      amountInMax.toString(),
      deadline
    );
  }

  async sell<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>,
    amountIn: MonetaryAmount<Collateral>,
    amountOutMin: MonetaryAmount<Collateral>
  ): Promise<ConfirmationNotifier> {
    const pair = await this.contracts.getPair(option.address);
    const hasApproved = await pair.checkAllowanceOption();
    if (!hasApproved) {
      await pair.approveMaxOption();
    }

    const deadline = makeDefaultDeadline();
    Big.PE = 40;
    return pair.sellOptions(
      amountIn.toString(),
      amountOutMin.toString(),
      deadline
    );
  }
}
