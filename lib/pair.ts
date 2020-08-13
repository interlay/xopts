import * as bitcoin from 'bitcoinjs-lib';
import {encodeBtcAddress} from './encode';
import {BigNumberish, BytesLike, BigNumber} from 'ethers';
import {Obligation} from '../typechain/Obligation';
import {Option} from '../typechain/Option';
import {ITreasury} from '../typechain/ITreasury';
import {OptionLib} from '../typechain/OptionLib';
import {Ierc20} from '../typechain/Ierc20';
import {BitcoinPriceFeed} from './feed';
import {BtcAddress} from './bitcoin';

interface EuropeanOption {
  contract: string;
  expiryTime: number;
  windowSize: number;
  strikePrice: BigNumber;
  spotPrice: number;
}

export interface ReadOptionPair {
  getDetails(): Promise<{
    expiryTime: number;
    windowSize: number;
    strikePrice: BigNumber;
  }>;

  getObligation(feed: BitcoinPriceFeed): Promise<EuropeanOption>;

  getOption(feed: BitcoinPriceFeed): Promise<EuropeanOption>;

  getBtcAddress(account: string, network: bitcoin.Network): Promise<string>;

  balanceOf(account: string): Promise<BigNumber>;
}

export interface WriteOptionPair extends ReadOptionPair {
  write(
    premium: BigNumberish,
    amount: BigNumberish,
    btcAddress?: BtcAddress
  ): Promise<void>;

  buyOptions(
    amountOut: BigNumberish,
    amountInMax: BigNumberish,
    deadline: BigNumberish
  ): Promise<void>;

  sellObligations(
    amountADesired: BigNumberish,
    amountBDesired: BigNumberish,
    amountAMin: BigNumberish,
    amountBMin: BigNumberish,
    deadline: BigNumberish
  ): Promise<void>;

  buyObligations(
    amountOut: BigNumberish,
    amountInMax: BigNumberish
  ): Promise<void>;

  requestExercise(seller: string, satoshis: BigNumberish): Promise<BigNumber>;

  executeExercise(
    seller: string,
    height: BigNumberish,
    index: BigNumberish,
    txid: BytesLike,
    header: BytesLike,
    proof: BytesLike,
    rawtx: BytesLike
  ): Promise<void>;

  refund(amount: BigNumberish): Promise<void>;
}

export class ReadOnlyOptionPair implements ReadOptionPair {
  protected option: Option;
  protected obligation: Obligation;
  protected optionLib: OptionLib;
  protected collateral: Ierc20;
  protected treasury: ITreasury;

  constructor(
    option: Option,
    obligation: Obligation,
    optionLib: OptionLib,
    collateral: Ierc20,
    treasury: ITreasury
  ) {
    this.option = option;
    this.obligation = obligation;
    this.optionLib = optionLib;
    this.collateral = collateral;
    this.treasury = treasury;
  }

  async getDetails(): Promise<{
    expiryTime: number;
    windowSize: number;
    strikePrice: BigNumber;
  }> {
    const [expiryTime, windowSize, strikePrice] = await Promise.all([
      this.option.expiryTime(),
      this.option.windowSize(),
      this.obligation.strikePrice()
    ]);
    return {
      expiryTime: expiryTime.toNumber(),
      windowSize: windowSize.toNumber(),
      strikePrice
    };
  }

  async getObligation(feed: BitcoinPriceFeed): Promise<EuropeanOption> {
    return {
      contract: this.obligation.address,
      spotPrice: await feed.getSpotPrice(),
      ...(await this.getDetails())
    };
  }

  async getOption(feed: BitcoinPriceFeed): Promise<EuropeanOption> {
    return {
      contract: this.option.address,
      spotPrice: await feed.getSpotPrice(),
      ...(await this.getDetails())
    };
  }

  async getBtcAddress(
    account: string,
    network: bitcoin.Network
  ): Promise<string> {
    const {btcHash, format} = await this.obligation.getBtcAddress(account);
    return encodeBtcAddress(btcHash.substr(2), format, network)!;
  }

  // gets the locked collateral for a pair
  async balanceOf(account: string): Promise<BigNumber> {
    return this.treasury.balanceOf(this.obligation.address, account);
  }
}

export class ReadWriteOptionPair extends ReadOnlyOptionPair
  implements WriteOptionPair {
  readonly account: string;
  readonly confirmations?: number;

  constructor(
    option: Option,
    obligation: Obligation,
    optionLib: OptionLib,
    collateral: Ierc20,
    treasury: ITreasury,
    account: string,
    confirmations?: number
  ) {
    super(option, obligation, optionLib, collateral, treasury);
    this.account = account;
    this.confirmations = confirmations;
  }

  // back options with the default collateral
  // this also adds liquidity to the uniswap pool
  async write(
    premium: BigNumberish,
    amount: BigNumberish,
    btcAddress: BtcAddress
  ): Promise<void> {
    await this.optionLib
      .lockAndWrite(
        this.option.address,
        this.collateral.address,
        this.collateral.address,
        amount,
        premium,
        amount,
        premium,
        btcAddress.btcHash,
        btcAddress.format
      )
      .then((tx) => tx.wait(this.confirmations));
  }

  async buyOptions(
    amountOut: BigNumberish,
    amountInMax: BigNumberish,
    deadline: BigNumberish
  ): Promise<void> {
    // buy order (i.e. specify exact number of options)
    await this.optionLib
      .swapTokensForExactTokens(
        amountOut,
        amountInMax,
        [this.collateral.address, this.option.address],
        this.account,
        deadline
      )
      .then((tx) => tx.wait(this.confirmations));
  }

  async sellObligations(
    amountADesired: BigNumberish,
    amountBDesired: BigNumberish,
    amountAMin: BigNumberish,
    amountBMin: BigNumberish,
    deadline: BigNumberish
  ): Promise<void> {
    await this.optionLib
      .addLiquidity(
        this.collateral.address,
        this.obligation.address,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        this.account,
        deadline
      )
      .then((tx) => tx.wait(this.confirmations));
  }

  async buyObligations(
    amountOut: BigNumberish,
    amountInMax: BigNumberish
  ): Promise<void> {
    await this.optionLib
      .lockAndBuy(amountOut, amountInMax, [
        this.collateral.address,
        this.obligation.address
      ])
      .then((tx) => tx.wait(this.confirmations));
  }

  async requestExercise(
    seller: string,
    satoshis: BigNumberish
  ): Promise<BigNumber> {
    await this.obligation
      .requestExercise(seller, satoshis)
      .then((tx) => tx.wait(this.confirmations));
    return this.obligation.getSecret(seller);
  }

  // prove inclusion and claim collateral
  async executeExercise(
    seller: string,
    height: BigNumberish,
    index: BigNumberish,
    txid: BytesLike,
    proof: BytesLike,
    rawtx: BytesLike
  ): Promise<void> {
    await this.obligation
      .executeExercise(seller, height, index, txid, proof, rawtx)
      .then((tx) => tx.wait(this.confirmations));
  }

  // claim written collateral after expiry
  async refund(amount: BigNumberish): Promise<void> {
    await this.obligation
      .refund(amount)
      .then((tx) => tx.wait(this.confirmations));
  }
}
