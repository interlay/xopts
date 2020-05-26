import { BuidlerConfig, usePlugin } from "@nomiclabs/buidler/config";
import contracts from "./contracts";

// Plugins
usePlugin("@nomiclabs/buidler-ganache");
usePlugin("@nomiclabs/buidler-waffle");
usePlugin("buidler-typechain");

// environment
var ganache_config = {
    url: 'http://127.0.0.1:8545',
    deterministic: true,
    mnemonic: 'lion album emotion suffer october belt uphold mind chronic stool february flag',
    network_id: 3,
    timeout: 0,
};

// if infura is available, fork from ropsten
const INFURA_ID = process.env.INFURA_XFLASH_ID;

if (INFURA_ID) {
    const INFURA_URL = 'https://ropsten.infura.io/v3/'.concat(INFURA_ID);
    ganache_config = {...ganache_config, ...{fork: INFURA_URL}};
    ganache_config = {...ganache_config, ...{unlocked_accounts: [contracts.dai_account, contracts.dai]}};
}

const config = {
	defaultNetwork: "buidlerevm",
	solc: {
        version: '0.5.15',
        optimizer: { enabled: true, runs: 200 }
	},
	paths: {
		sources: './src',
		tests: './test',
	},
	typechain: {
    	outDir: 'typechain',
    	target: 'ethers'
  	},
    networks: {
        buidlerevm : {
            gas: 1_000_000,
        },
        ganache: ganache_config,
    },
};

export default config;
