import {Option} from '../option';
import {Currency, ERC20} from '../monetary';

export interface Factory {
  createPair<Underlying extends Currency, Collateral extends ERC20>(
    option: Option<Underlying, Collateral>
  ): Promise<void>;
}
