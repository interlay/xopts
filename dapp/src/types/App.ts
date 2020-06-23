import { StorageInterface } from "./Storage";
import { BitcoinInterface } from "./Bitcoin";
import { ContractsInterface } from "./Contracts";
import { ethers } from "ethers";

export interface AppState {
  isWeb3: boolean
  isLoggedIn: boolean
  address: string
  btcProvider: BitcoinInterface
  contracts?: ContractsInterface
  storage: StorageInterface
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

export interface AppPropsLoading extends AppState {
  tryLogIn: (activeLogin: boolean) => Promise<void>
}

export interface AppProps extends AppPropsLoading {
  contracts: ContractsInterface
}