import { ethers } from "@nomiclabs/buidler";

// convert a BTC amount to satoshis
export function btcToSatoshi(amount: number) {
    return amount * 100_000_000;
}

// convert a BTC amount to satoshis
export function mbtcToSatoshi(amount: number) {
    return amount * 100_000;
}

// convert satoshis to mBTC
export function satoshiToMbtc(amount: number) {
    return Math.round(amount / 100_000);
}

// convert dai to weiDai
export function daiToWeiDai(amount: number) {
    return ethers.utils.parseEther(amount.toString());
}

// convert dai to weiDai
export function mdaiToWeiDai(amount: number) {
    let dai = amount / 1000;
    return daiToWeiDai(dai);
}

// convert weiDai to mDai
export function weiDaiToMdai(amount: string) {
    return ethers.utils.formatUnits(amount, 15);
}

// calculate the premium in dai for 1 BTC
export function premiumInDaiForOneBTC(amount: number) {
    let weiDai = daiToWeiDai(amount);
    return weiDai.div(btcToSatoshi(1));
}

// calculate the premium in dai for 1 BTC
export function strikePriceInDaiForOneBTC(amount: number) {
    let weiDai = daiToWeiDai(amount);
    return weiDai.div(btcToSatoshi(1));
}