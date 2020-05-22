import config from "../buidler.config";
import  * as child from "child_process";


const ganache_cmd = "ganache-cli";
const port = "-p 8545";
const mnemonic = "-m ".concat(config.networks.ganache.mnemonic);
const id = "-i ".concat(config.networks.ganache.network_id.toString());

// if infura is available, fork from ropsten
const INFURA_ID = process.env.INFURA_XFLASH_ID;

var fork = "";

if (INFURA_ID) {
    const INFURA_URL = 'https://ropsten.infura.io/v3/'.concat(INFURA_ID.toString());
    fork = "-f ".concat(INFURA_URL.toString());
}

const ganache_string = ganache_cmd.concat(" ", port, " ", mnemonic, " ", id, " ", fork);

console.log(ganache_string);

var ganache: child.ChildProcess = child.exec(ganache_string);

ganache.stdout!.on('data', (data) => {
    console.log(data.toString());
});
ganache.stderr!.on('data', (data) => {
    console.log(data.toString());
});
ganache.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
