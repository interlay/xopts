


export function satToBtc(sat){
    return sat / 100_000_000;
}

export function convertDai(microDai) {
    return microDai / Math.pow(10,10);
}


export function bin2string(array){
	var result = "";
	for(var i = 0; i < array.length; ++i){
		result+= (String.fromCharCode(array[i]));
	}
	return result;
}