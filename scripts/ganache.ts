/* eslint-disable no-console */

import config from '../buidler.config';
import * as child from 'child_process';

const ganacheCmd = 'ganache-cli';
const port = '-p 8545';
const mnemonic = '-m '.concat(config.networks.ganache.mnemonic);
const id = '-i '.concat(config.networks.ganache.networkId.toString());

// if infura is available, fork from ropsten
const INFURA_ID = process.env.INFURA_ID;

let fork = '';

if (INFURA_ID) {
  const INFURA_URL = 'https://ropsten.infura.io/v3/'.concat(
    INFURA_ID.toString()
  );
  fork = '-f '.concat(INFURA_URL.toString());
}

const ganacheString = ganacheCmd.concat(
  ' ',
  port,
  ' ',
  mnemonic,
  ' ',
  id,
  ' ',
  fork
);

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
