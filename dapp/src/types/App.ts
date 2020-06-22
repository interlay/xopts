import { StorageInterface } from "./Storage";
import { BitcoinInterface } from "./Bitcoin";

export interface AppState {
  isWeb3: boolean
  isLoggedIn: boolean
  signer: any
  address: string
  provider: any
  btcProvider: BitcoinInterface
  contracts: any
  storage: StorageInterface
  optionPoolContract: any
  btcPrices: {
    dai: number
    usd: number
    eth: number
  }
  daiPrices: {
    usd: number
    eth: number
  }
}

export interface AppProps extends AppState {
  tryLogIn: (activeLogin: boolean) => Promise<void>
}