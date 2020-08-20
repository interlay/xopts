import {usePlugin} from '@nomiclabs/buidler/config';
import {USDT} from './lib/constants';

// Plugins
usePlugin('@nomiclabs/buidler-ganache');
usePlugin('@nomiclabs/buidler-waffle');
usePlugin('@nodefactory/buidler-typechain');
usePlugin('buidler-gas-reporter');

// environment
let ganacheConfig = {
  url: 'http://127.0.0.1:8545',
  deterministic: true,
  mnemonic:
    'lion album emotion suffer october belt uphold mind chronic stool february flag',
  networkId: 2222,
  timeout: 0
};

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const INFURA_URL = `https://mainnet.infura.io/v3/${INFURA_API_KEY}`;

if (INFURA_API_KEY) {
  ganacheConfig = {
    ...ganacheConfig,
    ...{fork: INFURA_URL}
  };
}

const ROPSTEN_PRIVATE_KEY = process.env.ROPSTEN_PRIVATE_KEY || '';

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

const config = {
  defaultNetwork: 'buidlerevm',
  solc: {
    version: '0.6.6',
    optimizer: {enabled: true, runs: 200}
  },
  paths: {
    sources: './contracts',
    tests: './test'
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5'
  },
  networks: {
    buidlerevm: {
      gas: 1_000_000
    },
    ganache: ganacheConfig,
    ropsten: {
      url: INFURA_URL,
      accounts: [ROPSTEN_PRIVATE_KEY]
    },
    localhost: {
      timeout: 0
    }
  },
  gasReporter: {
    enabled: COINMARKETCAP_API_KEY ? true : false,
    // coinmarketcap: COINMARKETCAP_API_KEY,
    currency: 'GBP',
    src: './contracts'
  }
};

export default config;
