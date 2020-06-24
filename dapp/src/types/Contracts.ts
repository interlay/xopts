import { ethers } from "ethers";
import { Big } from 'big.js';

export type BigNumber = ethers.utils.BigNumber;

export interface ContractsInterface {
    relayContract: ethers.Contract

    getRelayHeight(): Promise<BigNumber>
    getOptions(): Promise<string[]>
    getUserPurchasedOptions(address: string): Promise<{ optionContracts: string[]; purchasedOptions: BigNumber[]; }>
    getUserSoldOptions(address: string): Promise<{
        optionContracts: string[];
        unsoldOptions: BigNumber[];
        totalOptions: BigNumber[];
        0: string[];
        1: BigNumber[];
        2: BigNumber[];
    }>
    checkAllowance(amount: Big): Promise<void>
    balanceOf(): Promise<BigNumber>
    mint(): Promise<ethers.ContractTransaction>
    attachOption(address: string): OptionInterface
    insureOption(address: string, seller: string, amount: Big): Promise<void>
    underwriteOption(address: string, amount: Big, btcAddressHex: string): Promise<void>
    exerciseOption(address: string, seller: string, height: number, index: number, txid: string, proof: string, rawtx: string): Promise<void>
    refundOption(address: string): Promise<void>
    createOption(expiry: number, premium: BigNumber, strikePrice: BigNumber): Promise<void>
}

export interface OptionInterface {
    address: string;

    getDetails(): Promise<{
        expiry: BigNumber;
        premium: BigNumber;
        strikePrice: BigNumber;
        total: BigNumber;
        totalSold: BigNumber;
        totalUnsold: BigNumber;
    }>
    getOptionSellers(): Promise<(string | ethers.utils.BigNumber)[][]>
    getOptionOwners(): Promise<(string | BigNumber)[][]>
    getBtcAddress(address: string): Promise<string>
    hasSellers(): Promise<boolean>
}