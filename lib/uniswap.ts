import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json';
import {deployContract} from 'ethereum-waffle';
import {Wallet, Signer, Contract, BigNumberish} from 'ethers';
import ethers from 'ethers';
import {IUniswapV2PairFactory} from '../typechain/IUniswapV2PairFactory';
import {IUniswapV2Pair} from '../typechain/IUniswapV2Pair';
import {BigNumber} from 'ethers';
import {IUniswapV2Factory} from '../typechain/IUniswapV2Factory';
import {IUniswapV2FactoryFactory} from '../typechain/IUniswapV2FactoryFactory';
import {TransactionResponse} from '@ethersproject/abstract-provider';

export async function deployUniswapFactory(signer: Signer, feeToSetter: string): Promise<IUniswapV2Factory> {
  const contract = await deployContract(signer as Wallet, UniswapV2Factory, [feeToSetter]);
  return IUniswapV2FactoryFactory.connect(contract.address, signer);
}

export async function createUniswapPair(factory: Contract, tokenA: string, tokenB: string): Promise<string> {
  const tx: TransactionResponse = await factory.createPair(tokenA, tokenB);

  return ethers.utils.defaultAbiCoder.decode(
    ['address'],
    ethers.utils.hexDataSlice((await tx.wait(0)).logs[0].data, 4)
  )[0];
}

export function getUniswapPair(signer: Signer, pairAddress: string): IUniswapV2Pair {
  return IUniswapV2PairFactory.connect(pairAddress, signer);
}

interface ERC20 {
  balanceOf(address: string): Promise<BigNumber>;
}

// https://uniswap.org/docs/v1/frontend-integration/trade-tokens/#amount-sold-buy-order
export async function estimateInput(
  pairAddress: string,
  input: ERC20,
  output: ERC20,
  amountOut: BigNumberish
): Promise<BigNumber> {
  const inputReserve = await input.balanceOf(pairAddress);
  const outputReserve = await output.balanceOf(pairAddress);

  const outputAmount = BigNumber.from(amountOut);
  const numerator = outputAmount.mul(inputReserve).mul(1000);
  const denominator = outputReserve.sub(outputAmount).mul(997);
  return numerator.div(denominator).add(1);
}

// https://uniswap.org/docs/v1/frontend-integration/trade-tokens/#amount-bought-sell-order
export async function estimateOutput(
  pairAddress: string,
  input: ERC20,
  output: ERC20,
  amountInput: BigNumberish
): Promise<BigNumber> {
  const inputReserve = await input.balanceOf(pairAddress);
  const outputReserve = await output.balanceOf(pairAddress);

  const inputAmount = BigNumber.from(amountInput);
  const numerator = inputAmount.mul(outputReserve).mul(997);
  const denominator = inputReserve.mul(1000).add(inputAmount.mul(997));
  return numerator.div(denominator);
}

export async function quote(
  pairAddress: string,
  tokenA: ERC20,
  tokenB: ERC20,
  amountA: BigNumberish
): Promise<BigNumber> {
  const reserveA = await tokenA.balanceOf(pairAddress);
  const reserveB = await tokenB.balanceOf(pairAddress);

  const amountAIn = BigNumber.from(amountA);
  return amountAIn.mul(reserveA).div(reserveB);
}
