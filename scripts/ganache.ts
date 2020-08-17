/* eslint-disable no-console */

import * as child from 'child_process';
import {USDT} from '../lib/constants';

const ganacheCmd = 'ganache-cli ';
const port = '-p 8545';

// if infura is available, fork from mainnet
const INFURA_API_KEY = process.env.INFURA_API_KEY;

let fork = '';
let unlock = '';

if (INFURA_API_KEY) {
  const INFURA_URL = `https://mainnet.infura.io/v3/${INFURA_API_KEY}`;
  fork = '-f '.concat(INFURA_URL.toString());
  unlock = '-u '.concat(USDT.owner);
}

const ganacheString = ganacheCmd.concat([port, fork, unlock].join(' '));

console.log(ganacheString);

const ganache: child.ChildProcess = child.exec(ganacheString);

ganache.stdout!.on('data', (data) => {
  console.log(data.toString());
});
ganache.stderr!.on('data', (data) => {
  console.log(data.toString());
});
ganache.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
