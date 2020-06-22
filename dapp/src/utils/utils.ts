import { Big } from 'big.js';

Big.DP = 30
Big.RM = 1
Big.PE = 30

type constructorArg = string | number | Big;

export function newBig(i: constructorArg) {
	return new Big(i);
}

export function btcToSat(btc: Big){
    return btc.mul(newBig(10).pow(8));
}

export function satToBtc(sat: Big){
	return sat.div(newBig(10).pow(8));
}

export function weiDaiToDai(weiDai: Big) {
    return weiDai.div(newBig(10).pow(18));
}

export function daiToWeiDai(dai: Big) {
	return dai.mul(newBig(10).pow(18));
}

export function weiDaiToBtc(weiDai: Big){
	return btcToSat(weiDaiToDai(weiDai));
}

export function bin2string(array: []){
	var result = "";
	for(var i = 0; i < array.length; ++i){
		result+= (String.fromCharCode(array[i]));
	}
	return result;
}

export function calculateAvailableBTC(amount: constructorArg, strikePrice: constructorArg) {
	return newBig(amount).div(strikePrice);
}

export function calculatePremium(amount: constructorArg, premium: constructorArg) {
	return newBig(amount).mul(premium);
}

export function btcPutOptionId(unixTimestamp: number, strikePrice: string) {
    var date = new Date(unixTimestamp * 1000);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return "BTC" + day.toString() + month.toUpperCase() + year.toString().slice(2) + "P" + strikePrice;
}