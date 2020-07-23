import { ethers } from "@nomiclabs/buidler";

export const MockSigner = () => ethers.Wallet.createRandom();