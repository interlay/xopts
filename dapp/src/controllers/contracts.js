import optionPoolArtifact from "../artifacts/OptionPool.json"
import erc20Artifact from "../artifacts/ICollateral.json"
import optionSellableArtifact from "../artifacts/IERC20Sellable.json"
import optionBuyableArtifact from "../artifacts/IERC20Buyable.json"
import { ethers } from 'ethers';
import * as xutils from '../utils/utils';

const DEFAULT_CONFIRMATIONS = 1;

export class Contracts {

    constructor(signer, optionPoolAddress, erc20Address) {
        this.signer = signer;

        this.optionPoolContract = new ethers.Contract(optionPoolAddress, optionPoolArtifact.abi, signer);
        this.erc20Contract = new ethers.Contract(erc20Address, erc20Artifact.abi, signer);
    }

    static resolve(network) {
        let optionPoolAddress = "";
        let erc20Address = "";
        // Ganache
        if (network.chainId === 2222) {
            optionPoolAddress = "0x3E99d12ACe8f4323DCf0f61713788D2d3649b599";
            erc20Address = "0x151eA753f0aF1634B90e1658054C247eFF1C2464";
        // Ropsten
        } else if (network.chainId === 3 && network.name === "ropsten") {
            optionPoolAddress = "0x80D56cB9a130042488b49607Aaaf6Ad0523bc8b6";
            erc20Address = "0x3DE71EcBa8ef146cbe56B72c8c0c4b5A23F0020C";
        // Buidlerevm
        } else if (network.chainId === 31337) {
            optionPoolAddress = "0xf4e77E5Da47AC3125140c470c71cBca77B5c638c";
            erc20Address = "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F";
        } else {
            throw new Error("Unsupported Network");
        }
        return {optionPoolAddress, erc20Address};
    
    }

    getOptions() {
        return this.optionPoolContract.getOptions();
    }

    getUserPurchasedOptions(address) {
        return this.optionPoolContract.getUserPurchasedOptions(address);
    }

    getUserSoldOptions(address) {
        return this.optionPoolContract.getUserSoldOptions(address);
    }

    async checkAllowance(amount) {
        let address = await this.signer.getAddress();
        let allowance = await this.erc20Contract.allowance(address, this.optionPoolContract.address);
        if (xutils.newBig(allowance.toString()).lt(amount)) {
            let tx = await this.erc20Contract.approve(this.optionPoolContract.address, ethers.constants.MaxUint256);
            await tx.wait(1);
        }
    }

    async balanceOf() {
        let address = await this.signer.getAddress();
        let balance = await this.erc20Contract.balanceOf(address);
        return balance;
    }

    async mint() {
        let address = await this.signer.getAddress();
        return this.erc20Contract.mint(address, xutils.daiToWeiDai(xutils.newBig(10_000)).toString());
    }

    attachOption(address) {
        return new Option(this.signer, address);
    }

    async insureOption(address, seller, amount) {
        let tx = await this.optionPoolContract.insureOption(address, seller, amount);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

    async underwriteOption(address, amount, btcAddress) {
        btcAddress = ethers.utils.toUtf8Bytes(btcAddress);
        let tx = await this.optionPoolContract.underwriteOption(address, amount.toString(), btcAddress);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

    async exerciseOption(address, seller, height, index, txid, proof, rawtx) {
        let tx = await this.optionPoolContract.exerciseOption(address, seller, height, index, txid, proof, rawtx);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

    async refundOption(address) {
        let tx = await this.optionPoolContract.refundOption(address);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

}

export class Option {
    constructor(signer, address) {
        this.address = address;
        this.signer = signer;
        this.sellable = new ethers.Contract(address, optionSellableArtifact.abi, signer);
    }

    getDetails() {
        return this.sellable.getDetails();
    }

    async getOptionSellers() {
        let [sellers, amounts] = await this.sellable.getOptionSellers();
        return sellers.map((seller, i) => {
            return [seller, amounts[i]];
        }).filter((value => {
            return xutils.newBig(value[1].toString()).gt(0);
        }));
    }

    async getOptionOwners() {
        let address = await this.signer.getAddress();
        let buyableAddress = await this.sellable.getBuyable();
        let buyable = new ethers.Contract(buyableAddress, optionBuyableArtifact.abi, this.signer);
        let [sellers, amounts] = await buyable.getOptionOwnersFor(address);
        return sellers.map((seller, i) => {
            return [seller, amounts[i]];
        }).filter((value => {
            return xutils.newBig(value[1].toString()).gt(0);
        }));
    }

    getBtcAddress(address) {
        return this.sellable.getBtcAddress(address);
    }

    async hasSellers() {
        return (await this.sellable.totalSupplyUnsold()) > 0;
    }
}
