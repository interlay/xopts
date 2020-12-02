import {OptionsReadWriteActions} from '../../../actions/options/read-write';
import {BtcAddress} from '../../../contracts';
import {Currency, ERC20, MonetaryAmount} from '../../../monetary';
import {Option} from '../../../types';
import {MockContractsOptionsReadOnlyActions} from './read-only';
import {Notifier} from '../../../notifier';

export class MockContractsOptionsReadWriteActions
  extends MockContractsOptionsReadOnlyActions
  implements OptionsReadWriteActions {
  write<Underlying extends Currency, Collateral extends ERC20>(
    _option: Option<Underlying, Collateral>,
    _amount: MonetaryAmount<Collateral>,
    _btcAddress: BtcAddress
  ): Promise<void> {
    return Promise.resolve();
  }

  async buy<Underlying extends Currency, Collateral extends ERC20>(
    _option: Option<Underlying, Collateral>,
    _amountOut: MonetaryAmount<Collateral>,
    _amountInMax: MonetaryAmount<Collateral>
  ): Promise<Notifier<any>> {
    return new Notifier(Promise.resolve());
  }
  async sell<Underlying extends Currency, Collateral extends ERC20>(
    _option: Option<Underlying, Collateral>,
    _amountIn: MonetaryAmount<Collateral>,
    _amountOutMin: MonetaryAmount<Collateral>
  ): Promise<Notifier<any>> {
    return new Notifier(Promise.resolve());
  }
}
