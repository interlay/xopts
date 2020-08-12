import {ethers} from '@nomiclabs/buidler';
import {Wallet} from 'ethers';

export const MockSigner = (): Wallet => ethers.Wallet.createRandom();

// runs the callback after increasing the evm time, resets after
export async function evmSnapFastForward<R>(
  n: number,
  cb: () => Promise<R>
): Promise<void> {
  const id = await ethers.provider.send('evm_snapshot', []);
  await ethers.provider.send('evm_increaseTime', [n]);
  await cb();
  await ethers.provider.send('evm_revert', [id]);
}
