import * as Big from 'big.js';

Big.DP = 30
Big.RM = 1
Big.PE = 30

export function newBig(i) {
	return new Big(i);
}

export function btcToSat(btc){
    return btc.mul(newBig(10).pow(8));
}

export function satToBtc(sat){
	return sat.div(newBig(10).pow(8));
}
export function weiDaiToDai(weiDai) {
    return weiDai.div(newBig(10).pow(18));
}

export function daiToWeiDai(dai) {
	return dai.mul(newBig(10).pow(18));
}

export function weiDaiToBtc(weiDai){
	return btcToSat(weiDaiToDai(weiDai));
}

export function bin2string(array){
	var result = "";
	for(var i = 0; i < array.length; ++i){
		result+= (String.fromCharCode(array[i]));
	}
	return result;
}

export function calculateAvailableBTC(amount, strikePrice) {
	return newBig(amount).div(strikePrice);
}

export function calculatePremium(amount, premium) {
	return newBig(amount).mul(premium);
}