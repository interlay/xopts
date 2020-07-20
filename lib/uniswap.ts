import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json';
import UniswapV2Pair from '@uniswap/v2-core/build/UniswapV2Pair.json';
import { deployContract } from 'ethereum-waffle';
import { Wallet, Signer, Contract } from 'ethers';
import { ethers } from "@nomiclabs/buidler";
import { TransactionResponse } from 'ethers/providers';

export function deployUniswapFactory(signer: Signer, feeToSetter: string) {
    return deployContract(<Wallet>signer, UniswapV2Factory, [feeToSetter]);
}

export async function createUniswapPair(factory: Contract, tokenA: string, tokenB: string): Promise<string> {
    let tx: TransactionResponse = await factory.createPair(tokenA, tokenB);

    return ethers.utils.defaultAbiCoder.decode(
        [ 'address' ],
        ethers.utils.hexDataSlice((await tx.wait(0)).logs[0].data, 4)
    )[0];
}

export function getUniswapPair(signer: Signer, pairAddress: string): Promise<Contract> {
    return ethers.getContractAt(UniswapV2Pair.abi, pairAddress, signer);
}