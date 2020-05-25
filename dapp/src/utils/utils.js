


export function btcToSat(sat){
    return sat * Math.pow(10,8);
}

export function satToBtc(btc){
	return btc / Math.pow(10,8);
}
export function weiDaiToDai(weiDai) {
    return weiDai / Math.pow(10,18);
}

export function daiToWeiDai(dai) {
	return dai * Math.pow(10,18);
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