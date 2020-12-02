import {Currency, ERC20} from '../monetary';
import {Position} from '../types';

export interface PositionActions {
  /**
   * Lists all the positions of the given address
   */
  list(address: string): Promise<Array<Position<Currency, ERC20>>>;
}

export class DefaultPositionActions implements PositionActions {
  list(address: string): Promise<Array<Position<Currency, ERC20>>> {
    throw new Error('not implemented yet');
  }
}
