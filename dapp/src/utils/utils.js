import Big from 'big.js';

Big.DP = 10
Big.RM = 1

function newBig(n) {
	return new Big(n);
}

export function btcToSat(btc){
    return newBig(btc.toString()).mul(newBig(10).pow(8)).toString();
}

export function satToBtc(sat){
	return newBig(sat.toString()).div(newBig(10).pow(8)).toString();
}

export function weiDaiToDai(weiDai) {
    return newBig(weiDai.toString()).div(newBig(10).pow(18)).toString();
}

export function daiToWeiDai(dai) {
	return newBig(dai.toString()).mul(newBig(10).pow(18)).toString();
}

export function weiDaiToBtc(weiDai){
	return btcToSat(weiDaiToDai(weiDai.toString()));
}

export function calculatePremium(sat, premium) {
	return newBig(sat).mul(premium).toString();
}

export function calculateInsure(sat, strikePrice) {
	return newBig(sat).mul(strikePrice).toString();
}

export function calculateExercise(sat, strikePrice) {
	return newBig(sat).div(strikePrice).toString();
}

export function calculatePercentage(n, total) {
	if (total <= 0) return 0;
	return (newBig(10000).mul(newBig(n).div(newBig(total)))).div(newBig(100)).toString();
}

export function add(left, right) {
	return newBig(left).add(newBig(right)).toString();
}

export function sub(left, right) {
	return newBig(left).sub(newBig(right)).toString();
}

export function div(left, right) {
	return newBig(left).div(newBig(right)).toString();
}

export function mul(left, right) {
	return newBig(left).mul(newBig(right)).toString();
}

export function round(n) {
	// 0 == down
	return newBig(n).round(0, 0).toString();
}

export function bin2string(array){
	var result = "";
	for(var i = 0; i < array.length; ++i){
		result+= (String.fromCharCode(array[i]));
	}
	return result;
}