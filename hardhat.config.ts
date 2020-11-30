// Plugins
import '@nomiclabs/hardhat-ganache';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-typechain';
import 'hardhat-gas-reporter';

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

const ROPSTEN_PRIVATE_KEY =
  process.env.ROPSTEN_PRIVATE_KEY ||
  '5de75329e619948d55744d85d763790ae3f7643f0a498070558acdb37d6b2057'; // Dummy wallet

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

const config = {
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.6.6',
    settings: {
      optimizer: {enabled: true, runs: 300}
    }
  },
  paths: {
    sources: './contracts',
    tests: './test'
  },
  typechain: {
    outDir: './typechain',
    target: 'ethers-v5'
  },
  networks: {
    hardhat: {
      gas: 1_000_000,
      chainId: 31337
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
