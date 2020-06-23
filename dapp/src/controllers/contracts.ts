import { ethers } from 'ethers';
import * as xutils from '../utils/utils';
import { Big } from 'big.js';
import { ContractsInterface } from "../types/Contracts";
import { OptionPoolFactory } from '@interlay/xopts/dist/typechain/OptionPoolFactory';
import { OptionPool } from '@interlay/xopts/dist/typechain/OptionPool';
import { ICollateralFactory } from '@interlay/xopts/dist/typechain/ICollateralFactory';
import { ICollateral } from "@interlay/xopts/dist/typechain/ICollateral";
import { IRelayFactory } from '@interlay/xopts/dist/typechain/IRelayFactory';
import { IRelay } from "@interlay/xopts/dist/typechain/IRelay";
import { IERC20SellableFactory } from "@interlay/xopts/dist/typechain/IERC20SellableFactory";
import { IERC20Sellable } from "@interlay/xopts/dist/typechain/IERC20Sellable";
import { IERC20BuyableFactory } from "@interlay/xopts/dist/typechain/IERC20BuyableFactory";

const DEFAULT_CONFIRMATIONS = 1;

type Signer = ethers.Signer;
type Contract = ethers.Contract;
type Provider = ethers.providers.InfuraProvider | ethers.providers.Web3Provider;

export class Contracts implements ContractsInterface {
    signer: Signer | Provider;
    optionPoolContract: OptionPool;
    erc20Contract: ICollateral;
    relayContract: IRelay;

    constructor(signer: Signer | Provider, optionPoolAddress: string, erc20Address: string, relayAddress: string) {
        this.signer = signer;

        this.optionPoolContract = OptionPoolFactory.connect(optionPoolAddress, signer);
        this.erc20Contract = ICollateralFactory.connect(erc20Address, signer);
        this.relayContract = IRelayFactory.connect(relayAddress, signer);
    }

    static resolve(network: {chainId: number; name: string;}) {
        let optionPoolAddress = "";
        let erc20Address = "";
        let relayAddress = "";
        // Ganache
        if (network.chainId === 2222) {
            optionPoolAddress = "0x3E99d12ACe8f4323DCf0f61713788D2d3649b599";
            erc20Address = "0x151eA753f0aF1634B90e1658054C247eFF1C2464";
            relayAddress = "0x99a463962829c26Da5357aE84ACAf85A401A7702"
        // Ropsten
        } else if (network.chainId === 3 && network.name === "ropsten") {
            optionPoolAddress = "0x11Bb2d104E82a4DE8e40E9562d17999Ec2E46B8c";
            erc20Address = "0x4DfB2bE72b3F2ac346Be86B78491E56f21522fB2";
            relayAddress = "0x78A389B693e0E3DE1849F34e70bf4Bcb57F0F2bb";
        // Buidlerevm
        } else if (network.chainId === 31337) {
            optionPoolAddress = "0xf4e77E5Da47AC3125140c470c71cBca77B5c638c";
            erc20Address = "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F";
            relayAddress = "0x8858eeB3DfffA017D4BCE9801D340D36Cf895CCf";
        } else {
            throw new Error("Unsupported Network");
        }
        return {optionPoolAddress, erc20Address, relayAddress};
    }

    async maybeGetAddress() {
        let address = "";
        if (this.signer instanceof ethers.Signer) {
            address = await this.signer.getAddress();
        }
        return address;
    }

    async getRelayHeight() {
        const {height} = await this.relayContract.getBestBlock();
        return height;
    }

    getOptions() {
        return this.optionPoolContract.getOptions();
    }

    async getUserPurchasedOptions(address: string) {
        const {optionContracts, purchasedOptions} = await this.optionPoolContract.getUserPurchasedOptions(address);
        return {optionContracts, purchasedOptions}
    }

    getUserSoldOptions(address: string) {
        return this.optionPoolContract.getUserSoldOptions(address);
    }

    async checkAllowance(amount: Big) {
        let address = await this.maybeGetAddress();
        let allowance = await this.erc20Contract.allowance(address, this.optionPoolContract.address);
        if (xutils.newBig(allowance.toString()).lt(amount)) {
            let tx = await this.erc20Contract.approve(this.optionPoolContract.address, ethers.constants.MaxUint256);
            await tx.wait(1);
        }
    }

    async balanceOf() {
        let address = await this.maybeGetAddress();
        let balance = await this.erc20Contract.balanceOf(address);
        return balance;
    }

    async mint() {
        let address = await this.maybeGetAddress();
        return this.erc20Contract.mint(address, xutils.daiToWeiDai(xutils.newBig(10_000)).toString());
    }

    attachOption(address: string) {
        return new Option(this.signer, address);
    }

    async insureOption(address: string, seller: string, amount: Big) {
        let tx = await this.optionPoolContract.insureOption(address, seller, amount.toString());
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

    async underwriteOption(address: string, amount: Big, btcAddressHex: string) {
        let btcAddress = ethers.utils.toUtf8Bytes(btcAddressHex);
        let tx = await this.optionPoolContract.underwriteOption(address, amount.toString(), btcAddress);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

    async exerciseOption(address: string, seller: string, height: number, index: number, txid: string, proof: string, rawtx: string) {
        let tx = await this.optionPoolContract.exerciseOption(address, seller, height, index, txid, proof, rawtx);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

    async refundOption(address: string) {
        let tx = await this.optionPoolContract.refundOption(address);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }
}

export class Option {
    address: string;
    signer: Signer | Provider;
    sellable: IERC20Sellable;

    constructor(signer: Signer | Provider, address: string) {
        this.address = address;
        this.signer = signer;
        this.sellable = IERC20SellableFactory.connect(address, signer);
    }

    async getDetails() {
        const {0: expiry, 1: premium, 2: strikePrice, 3: total, 4: totalSold, 5: totalUnsold} = await this.sellable.getDetails();
        return {expiry, premium, strikePrice, total, totalSold, totalUnsold};
    }

    async getOptionSellers() {
        let {sellers, options} = await this.sellable.getOptionSellers();
        return sellers.map((seller, i) => {
            return [seller, options[i]];
        }).filter((value => {
            return xutils.newBig(value[1].toString()).gt(0);
        }));
    }

    async maybeGetAddress() {
        let address = "";
        if (this.signer instanceof ethers.Signer) {
            address = await this.signer.getAddress();
        }
        return address;
    }

    async getOptionOwners() {
        let address = await this.maybeGetAddress();
        let buyableAddress = await this.sellable.getBuyable();
        let buyable = IERC20BuyableFactory.connect(buyableAddress, this.signer);
        let {sellers, options} = await buyable.getOptionOwnersFor(address);
        return sellers.map((seller, i) => {
            return [seller, options[i]];
        }).filter((value => {
            return xutils.newBig(value[1].toString()).gt(0);
        }));
    }

    getBtcAddress(address: string) {
        return this.sellable.getBtcAddress(address);
    }

    async hasSellers() {
        return (await this.sellable.totalSupplyUnsold()).gt(0);
    }
}
