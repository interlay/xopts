import * as bitcoin from 'bitcoinjs-lib';
import { Script } from './constants';

function decode<P extends bitcoin.Payment, O>(p: P, f: (payment: P, options?: O) => P, t: Script): { hash: string, format: Script} | undefined {
    try {
        let pay = f(p)
        let hash = pay.hash ? "0x" + pay.hash.toString('hex') : '';        
        return { hash: hash, format: t};
    } catch (err) {
        return undefined;
    }
}

export function decodeBtcAddress(address: string, network: bitcoin.Network) {
    return decode({ address, network }, bitcoin.payments.p2sh, Script.p2sh) ||
           decode({ address, network }, bitcoin.payments.p2pkh, Script.p2pkh) ||
           decode({ address, network }, bitcoin.payments.p2wpkh, Script.p2wpkh);
}

function toAddress<P extends bitcoin.Payment, O>(p: P, f: (payment: P, options?: O) => P) {
    try {
        let pay = f(p)
        return pay.address ? pay.address : undefined;        
    } catch (err) {
        return undefined;
    }
}

export function encodeBtcAddress(hex: string, format: Script, network: bitcoin.Network) {
    const hash = Buffer.from(hex, 'hex');
    switch (format) {
        case Script.p2sh:
            return toAddress({ hash, network }, bitcoin.payments.p2sh);
        case Script.p2pkh:
            return toAddress({ hash, network }, bitcoin.payments.p2pkh);
        case Script.p2wpkh:
            return toAddress({ hash, network }, bitcoin.payments.p2wpkh);
    }
}