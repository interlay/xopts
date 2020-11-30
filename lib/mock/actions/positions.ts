import {Currency, ERC20} from '../../monetary';
import {Position} from '../../types';
import {positions as mockPositions} from '../db';

export class MockPositionActions {
  list(address: string): Promise<Array<Position<Currency, ERC20>>> {
    const positions = mockPositions.filter(
      (pos) => pos.account.toLowerCase() === address.toLowerCase()
    );
    return Promise.resolve(positions);
  }
}
