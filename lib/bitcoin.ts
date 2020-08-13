import {BytesLike} from 'ethers';
import {Script} from './constants';

export type BtcAddress = {
  btcHash: BytesLike;
  format: Script;
};
