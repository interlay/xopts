import {ethers, Contract, ContractReceipt, ContractTransaction} from 'ethers';
import {Obligation} from '../typechain/Obligation';
import {OptionPairFactory} from '../typechain/OptionPairFactory';
import {BigNumberish, BytesLike, BigNumber} from 'ethers';
import {Option} from '../typechain/Option';
import {OptionPairFactoryFactory} from '../typechain/OptionPairFactoryFactory';
import {OptionFactory} from '../typechain/OptionFactory';
import {OptionLibFactory} from '../typechain/OptionLibFactory';
import {OptionLib} from '../typechain/OptionLib';
import {Script} from './constants';
import {Ierc20} from '../typechain/Ierc20';
import {Ierc20Factory} from '../typechain/Ierc20Factory';
import {IRelay} from '../typechain/IRelay';
import {IReferee} from '../typechain/IReferee';
import {IRelayFactory} from '../typechain/IRelayFactory';
import {IRefereeFactory} from '../typechain/IRefereeFactory';
import {ITreasury} from '../typechain/ITreasury';
import {ITreasuryFactory} from '../typechain/ITreasuryFactory';
import {ObligationFactory} from '../typechain/ObligationFactory';
import {IWriterRegistry} from '../typechain/IWriterRegistry';
import {IWriterRegistryFactory} from '../typechain/IWriterRegistryFactory';
import {SignerOrProvider, Optional, Signer, Provider} from './core';
import {Addresses, resolveAddresses} from './addresses';
import {EventFragment, Result} from 'ethers/lib/utils';
import {ConfirmationNotifier} from './notifier';

export type AddressesPair = {option: string; obligation: string};

type ObligationInfo = {
  _expiryTime: BigNumber;
  _windowSize: BigNumber;
  _strikePrice: BigNumber;
  _decimals: BigNumber;
  _collateral: string;
  _option: string;
};

interface Connectable<C> {
  connect: (addr: string, signer: SignerOrProvider) => C;
}

interface Callable {
  address: string;
}

export function reconnect<C extends Callable, A extends Connectable<C>>(
  contract: C,
  factory: A,
  signer: Signer
): C {
  return factory.connect(contract.address, signer);
}

export function deploy0<C extends Callable>(
  signer: Signer,
  factory: new (signer: Signer) => {
    deploy: () => Promise<C>;
  }
): Promise<C> {
  return new factory(signer).deploy();
}

export function deploy1<A extends Callable, B>(
  signer: Signer,
  factory: new (signer: Signer) => {
    deploy: (b: B) => Promise<A>;
  },
  arg: B
): Promise<A> {
  return new factory(signer).deploy(arg);
}

export function deploy2<A extends Callable, B, C>(
  signer: Signer,
  factory: new (signer: Signer) => {
    deploy: (b: B, c: C) => Promise<A>;
  },
  arg0: B,
  arg1: C
): Promise<A> {
  return new factory(signer).deploy(arg0, arg1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEvent<T extends any[]>(
  fragment: EventFragment,
  args: T,
  receipt: ContractReceipt,
  contract: Contract
): Promise<Result> {
  // indexed parameters are not included in log data
  const topics = contract.interface.encodeFilterTopics(fragment, args);
  const log = receipt.logs.find((log) =>
    log.topics.every((val, i) => val === topics[i])
  );
  return contract.interface.decodeEventLog(fragment, log!.data);
}

export function getRequestEvent(
  obligation: Obligation,
  buyer: string,
  seller: string,
  receipt: ContractReceipt
): Promise<Result> {
  const fragment =
    obligation.interface.events[
      'RequestExercise(address,address,bytes32,uint256)'
    ];
  return getEvent(fragment, [buyer, seller], receipt, obligation);
}

export function getCreatePairEvent(
  optionFactory: OptionPairFactory,
  receipt: ContractReceipt
): Promise<Result> {
  const fragment =
    optionFactory.interface.events[
      'CreatePair(address,address,address,uint256,uint256,uint256)'
    ];
  return getEvent(fragment, [], receipt, optionFactory);
}

export async function createPair(
  optionFactory: OptionPairFactory,
  expiryTime: BigNumberish,
  windowSize: BigNumberish,
  strikePrice: BigNumberish,
  collateral: string,
  referee: string,
  confirmations?: number
): Promise<AddressesPair> {
  const receipt = await optionFactory
    .createPair(expiryTime, windowSize, strikePrice, collateral, referee)
    .then((tx) => tx.wait(confirmations));
  const event = await getCreatePairEvent(optionFactory, receipt);
  return {option: event.option, obligation: event.obligation};
}

export type BtcAddress = {
  hash: BytesLike;
  format: Script;
};

export interface ReadOptionPair {
  getDetails(): Promise<ObligationInfo>;
  getPairAddress(): Promise<string>;

  totalSupplied(account: string): Promise<BigNumber>;
  totalWritten(account: string): Promise<BigNumber>;
}

export interface WriteOptionPair extends ReadOptionPair {
  write(
    premium: BigNumberish,
    amount: BigNumberish,
    btcAddress?: BtcAddress
  ): ConfirmationNotifier;

  buyOptions(
    amountOut: BigNumberish,
    amountInMax: BigNumberish,
    deadline: BigNumberish
  ): ConfirmationNotifier;

  sellObligations(
    amountADesired: BigNumberish,
    amountBDesired: BigNumberish,
    amountAMin: BigNumberish,
    amountBMin: BigNumberish,
    deadline: BigNumberish
  ): ConfirmationNotifier;

  buyObligations(
    amountOut: BigNumberish,
    amountInMax: BigNumberish
  ): ConfirmationNotifier;

  requestExercise(seller: string, satoshis: BigNumberish): ConfirmationNotifier;

  executeExercise(
    seller: string,
    height: BigNumberish,
    index: BigNumberish,
    txid: BytesLike,
    header: BytesLike,
    proof: BytesLike,
    rawtx: BytesLike
  ): ConfirmationNotifier;
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

  async getDetails(): Promise<ObligationInfo> {
    return this.obligation.getDetails();
  }

  getPairAddress(): Promise<string> {
    return this.optionLib.getPairAddress(
      this.option.address,
      this.collateral.address
    );
  }

  // gets the locked collateral for a pair
  // total number of USDT written
  async totalSupplied(account: string): Promise<BigNumber> {
    return this.treasury.lockedIn(this.obligation.address, account);
  }

  async totalWritten(account: string): Promise<BigNumber> {
    return this.obligation.obligations(account);
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
  write(
    premium: BigNumberish,
    amount: BigNumberish,
    btcAddress: BtcAddress
  ): ConfirmationNotifier {
    // TODO: write position
    return this.waitConfirm(
      this.optionLib.lockAndWrite(
        this.option.address,
        this.collateral.address,
        this.collateral.address,
        amount,
        premium,
        amount,
        premium
      )
    );
  }

  buyOptions(
    amountOut: BigNumberish,
    amountInMax: BigNumberish,
    deadline: BigNumberish
  ): ConfirmationNotifier {
    // buy order (i.e. specify exact number of options)
    return this.waitConfirm(
      this.optionLib.swapTokensForExactTokens(
        amountOut,
        amountInMax,
        [this.collateral.address, this.option.address],
        this.account,
        deadline
      )
    );
  }

  sellObligations(
    amountADesired: BigNumberish,
    amountBDesired: BigNumberish,
    amountAMin: BigNumberish,
    amountBMin: BigNumberish,
    deadline: BigNumberish
  ): ConfirmationNotifier {
    return this.waitConfirm(
      this.optionLib.addLiquidity(
        this.collateral.address,
        this.obligation.address,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        this.account,
        deadline
      )
    );
  }

  buyObligations(
    amountOut: BigNumberish,
    amountInMax: BigNumberish
  ): ConfirmationNotifier {
    return this.waitConfirm(
      this.optionLib.lockAndBuy(amountOut, amountInMax, [
        this.collateral.address,
        this.obligation.address
      ])
    );
  }

  requestExercise(
    seller: string,
    satoshis: BigNumberish
  ): ConfirmationNotifier {
    return this.waitConfirm(this.obligation.requestExercise(seller, satoshis));
  }

  // prove inclusion and claim collateral
  executeExercise(
    seller: string,
    height: BigNumberish,
    index: BigNumberish,
    txid: BytesLike,
    header: BytesLike,
    proof: BytesLike,
    rawtx: BytesLike
  ): ConfirmationNotifier {
    return this.waitConfirm(
      this.obligation.executeExercise(
        seller,
        height,
        index,
        txid,
        header,
        proof,
        rawtx
      )
    );
  }

  private waitConfirm(
    promise: Promise<ContractTransaction>
  ): ConfirmationNotifier {
    return new ConfirmationNotifier(
      promise.then((tx) => tx.wait(this.confirmations))
    );
  }
}

export interface ReadContracts {
  getRelayHeight(): Promise<number>;

  getPair(option: string): Promise<ReadOptionPair>;

  listOptions(): Promise<string[]>;
  totalLiquidity(): Promise<BigNumber>;
}

export interface WriteContracts extends ReadContracts {
  checkAllowance(): Promise<boolean>;

  approveMax(): Promise<void>;

  createPair(
    expiryTime: BigNumberish,
    windowSize: BigNumberish,
    strikePrice: BigNumberish
  ): Promise<WriteOptionPair>;

  getPair(option: string): Promise<WriteOptionPair>;
}

export class ReadOnlyContracts implements ReadContracts {
  readonly optionFactory: OptionPairFactory;
  readonly optionLib: OptionLib;
  readonly collateral: Ierc20;
  readonly referee: IReferee;
  readonly relay: IRelay;
  readonly writerRegistry: IWriterRegistry;

  readonly signer: SignerOrProvider;

  constructor(
    optionFactory: OptionPairFactory,
    optionLib: OptionLib,
    collateral: Ierc20,
    referee: IReferee,
    relay: IRelay,
    writerRegistry: IWriterRegistry,
    signer: SignerOrProvider
  ) {
    this.optionFactory = optionFactory;
    this.optionLib = optionLib;
    this.collateral = collateral;
    this.referee = referee;
    this.relay = relay;
    this.writerRegistry = writerRegistry;
    this.signer = signer;
  }

  static async load(
    contracts: Addresses,
    signer: SignerOrProvider
  ): Promise<ReadOnlyContracts> {
    const _optionFactory = OptionPairFactoryFactory.connect(
      contracts.optionFactory,
      signer
    );
    const _optionLib = OptionLibFactory.connect(contracts.optionLib, signer);
    const _collateral = Ierc20Factory.connect(contracts.collateral, signer);
    const _referee = IRefereeFactory.connect(contracts.referee, signer);
    const _relay = IRelayFactory.connect(contracts.relay, signer);
    const _writerRegistry = IWriterRegistryFactory.connect(
      contracts.writerRegistry,
      signer
    );
    return new ReadOnlyContracts(
      _optionFactory,
      _optionLib,
      _collateral,
      _referee,
      _relay,
      _writerRegistry,
      signer
    );
  }

  static async resolve(
    provider: Provider
  ): Promise<Optional<ReadOnlyContracts>> {
    const addresses = await resolveAddresses(provider);
    return addresses ? this.load(addresses, provider) : undefined;
  }

  async getRelayHeight(): Promise<number> {
    const {height} = await this.relay.getBestBlock();
    return height;
  }

  async getPair(optionAddress: string): Promise<ReadOptionPair> {
    const option = OptionFactory.connect(optionAddress, this.signer);
    const obligationAddress = await option.owner();
    const obligation = ObligationFactory.connect(
      obligationAddress,
      this.signer
    );
    const treasuryAddress = await obligation.treasury();
    const treasury = ITreasuryFactory.connect(treasuryAddress, this.signer);
    return new ReadOnlyOptionPair(
      option,
      obligation,
      this.optionLib,
      this.collateral,
      treasury
    );
  }

  async totalLiquidity(): Promise<BigNumber> {
    // NOTE: this only works while we use a single collateral
    const treasury = await this.optionFactory.getTreasury(
      this.collateral.address
    );
    return this.collateral.balanceOf(treasury);
  }

  listOptions(): Promise<string[]> {
    return this.optionFactory.allOptions();
  }
}

type JsonRpcProvider = ethers.providers.JsonRpcProvider;

export class ReadWriteContracts extends ReadOnlyContracts
  implements WriteContracts {
  readonly account: string;
  readonly confirmations?: number;

  constructor(
    optionFactory: OptionPairFactory,
    optionLib: OptionLib,
    collateral: Ierc20,
    referee: IReferee,
    relay: IRelay,
    writerRegistry: IWriterRegistry,
    signer: Signer,
    account: string,
    confirmations?: number
  ) {
    super(
      optionFactory,
      optionLib,
      collateral,
      referee,
      relay,
      writerRegistry,
      signer
    );
    this.account = account;
    this.confirmations = confirmations;
  }

  static async load(
    contracts: Addresses,
    signer: Signer,
    confirmations?: number
  ): Promise<ReadWriteContracts> {
    const _optionFactory = OptionPairFactoryFactory.connect(
      contracts.optionFactory,
      signer
    );
    const _optionLib = OptionLibFactory.connect(contracts.optionLib, signer);
    const _collateral = Ierc20Factory.connect(contracts.collateral, signer);
    const _referee = IRefereeFactory.connect(contracts.referee, signer);
    const _relay = IRelayFactory.connect(contracts.relay, signer);
    const _writerRegistry = IWriterRegistryFactory.connect(
      contracts.writerRegistry,
      signer
    );
    const account = await signer.getAddress();
    return new ReadWriteContracts(
      _optionFactory,
      _optionLib,
      _collateral,
      _referee,
      _relay,
      _writerRegistry,
      signer,
      account,
      confirmations
    );
  }

  static async resolve(
    provider: JsonRpcProvider,
    confirmations?: number
  ): Promise<Optional<ReadWriteContracts>> {
    const addresses = await resolveAddresses(provider);
    return addresses
      ? this.load(addresses, provider.getSigner(), confirmations)
      : undefined;
  }

  // if this returns false we should call `approveMax`
  async checkAllowance(): Promise<boolean> {
    const amount = await this.collateral.allowance(
      this.account,
      this.optionLib.address
    );
    return amount.eq(ethers.constants.MaxUint256);
  }

  // in order to limit the number of transactions we need to
  // pre-approve our contracts to work with the max allowance
  async approveMax(): Promise<void> {
    await this.collateral.approve(
      this.optionLib.address,
      ethers.constants.MaxUint256
    );
  }

  // creates a european put option
  async createPair(
    expiryTime: BigNumberish,
    windowSize: BigNumberish,
    strikePrice: BigNumberish
  ): Promise<WriteOptionPair> {
    const {option} = await createPair(
      this.optionFactory,
      expiryTime,
      windowSize,
      strikePrice,
      this.collateral.address,
      this.referee.address,
      this.confirmations
    );
    return this.getPair(option);
  }

  async getPair(optionAddress: string): Promise<WriteOptionPair> {
    const option = OptionFactory.connect(optionAddress, this.signer);
    const obligationAddress = await this.optionFactory.getObligation(
      optionAddress
    );
    const obligation = ObligationFactory.connect(
      obligationAddress,
      this.signer
    );
    const treasuryAddress = await obligation.treasury();
    const treasury = ITreasuryFactory.connect(treasuryAddress, this.signer);
    return new ReadWriteOptionPair(
      option,
      obligation,
      this.optionLib,
      this.collateral,
      treasury,
      this.account,
      this.confirmations
    );
  }
}
