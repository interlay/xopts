import { ethers, Signer, ContractTransaction } from "ethers";
import { Obligation } from "../typechain/Obligation";
import { OptionPairFactory } from "../typechain/OptionPairFactory";
import { BigNumberish, Arrayish, BigNumber } from "ethers/utils";
import { Option } from "../typechain/Option";
import { OptionPairFactoryFactory } from "../typechain/OptionPairFactoryFactory";
import { OptionFactory } from "../typechain/OptionFactory";
import { OptionLibFactory } from "../typechain/OptionLibFactory";
import { OptionLib } from "../typechain/OptionLib";
import { Script } from "./constants";
import { IERC20 } from "../typechain/IERC20";
import { IERC20Factory } from "../typechain/IERC20Factory";
import { IRelay } from "../typechain/IRelay";
import { IReferee } from "../typechain/IReferee";
import { IRelayFactory } from "../typechain/IRelayFactory";
import { IRefereeFactory } from "../typechain/IRefereeFactory";
import { ITreasury } from "../typechain/ITreasury";
import { ITreasuryFactory } from "../typechain/ITreasuryFactory";
import { ObligationFactory } from "../typechain/ObligationFactory";
import * as bitcoin from 'bitcoinjs-lib';
import { encodeBtcAddress } from "./encode";
import { Addresses, Deployments } from "./addresses";
import { Provider, InfuraProvider, Web3Provider } from "ethers/providers";

interface Connectable<C> {
    connect: (addr: string, signer?: Signer) => C;
}

interface Callable {
    address: string;
}

export function reconnect<C extends Callable, A extends Connectable<C>>(contract: C, factory: A, signer: Signer): C {
    return factory.connect(contract.address, signer);
}

export function deploy0<C extends Callable>(signer: Signer, factory: new (signer: Signer) => { deploy: () => Promise<C> }) {
    return (new factory(signer)).deploy();
}

export function deploy1<A extends Callable, B>(signer: Signer, factory: new (signer: Signer) => { deploy: (b: B) => Promise<A> }, arg: B) {
    return (new factory(signer)).deploy(arg);
}

export function deploy2<A extends Callable, B, C>(signer: Signer, factory: new (signer: Signer) => { deploy: (b: B, c: C) => Promise<A> }, arg0: B, arg1: C) {
    return (new factory(signer)).deploy(arg0, arg1);
}

export async function createPair(
    optionFactory: OptionPairFactory,
    expiryTime: BigNumberish,
    windowSize: BigNumberish,
    strikePrice: BigNumberish,
    collateral: string,
    referee: string,
    confirmations?: number,
): Promise<string> {
    let topic = ethers.utils.id("Create(address,address,uint256,uint256,uint256)");
    // indexed parameters are not included in log data
    return optionFactory.createPair(expiryTime, windowSize, strikePrice, collateral, referee).then(tx =>
        tx.wait(confirmations).then(receipt => ethers.utils.defaultAbiCoder.decode(
            [ 'address' ], receipt.logs.find(log => log.topics.find(name => name == topic)).topics[1]
        )[0]));
}

type SignerOrProvider = Signer | Provider;
type SignerAndProvider = Signer & Provider;
type Optional<T> = T | undefined;

async function resolve(provider: Provider): Promise<Optional<Addresses>> {
    let network = await provider.getNetwork();

    switch (network.chainId) {
        case 31337:
            // Buidlerevm
            return Deployments.buidler;
        case 2222:
            // Ganache
            return Deployments.ganache;
        default:
            return;
    }
}

type BtcAddress = {
    btcHash: Arrayish,
    format: Script,
}

export interface IReadContracts {
    getRelayHeight(): Promise<number>;

    getPair(option: string): Promise<IReadOptionPair>;

    listOptions(): Promise<string[]>;
}

export interface IWriteContracts extends IReadContracts {
    checkAllowance(): Promise<boolean>;
    
    approveMax(): Promise<ContractTransaction>;
    
    createPair(
        expiryTime: BigNumberish,
        windowSize: BigNumberish,
        strikePrice: BigNumberish,
    ): Promise<IWriteOptionPair>;

    getBtcAddress(): Promise<BtcAddress>;

    getPair(option: string): Promise<IWriteOptionPair>;
}

export class ReadOnlyContracts implements IReadContracts {
    protected optionFactory: OptionPairFactory;
    protected optionLib: OptionLib;
    protected collateral: IERC20;
    protected treasury: ITreasury;
    protected referee: IReferee;
    protected relay: IRelay;

    readonly signer: SignerOrProvider;

    constructor(
        optionFactory: OptionPairFactory,
        optionLib: OptionLib,
        collateral: IERC20,
        treasury: ITreasury,
        referee: IReferee,
        relay: IRelay,
        signer: SignerOrProvider,
    ) {
        this.optionFactory = optionFactory;
        this.optionLib = optionLib;
        this.collateral = collateral;
        this.treasury = treasury;
        this.referee = referee;
        this.relay = relay;
        this.signer = signer;
    }

    static async load(
        contracts: Addresses,
        signer: SignerOrProvider
    ): Promise<ReadOnlyContracts> {
        const _optionFactory = OptionPairFactoryFactory.connect(contracts.optionFactory, signer);
        const _optionLib = OptionLibFactory.connect(contracts.optionLib, signer);
        const _collateral = IERC20Factory.connect(contracts.collateral, signer);
        const _treasuryAddress = await _optionFactory.getTreasury(_collateral.address);
        const _treasury = ITreasuryFactory.connect(_treasuryAddress, signer);
        const _referee = IRefereeFactory.connect(contracts.referee, signer);
        const _relay = IRelayFactory.connect(contracts.relay, signer);
        return new ReadOnlyContracts(
            _optionFactory,
            _optionLib,
            _collateral,
            _treasury,
            _referee,
            _relay,
            signer
        );
    }

    static async resolve(provider: Provider): Promise<Optional<ReadOnlyContracts>> {
        const addresses = await resolve(provider);
        return addresses ? this.load(addresses, provider) : undefined;
    }

    async getRelayHeight() {
        const {height} = await this.relay.getBestBlock();
        return height;
    }

    async getPair(
        optionAddress: string,
    ): Promise<IReadOptionPair> {
        const obligationAddress = await this.optionFactory.getObligation(optionAddress);
        const option = OptionFactory.connect(optionAddress, this.signer);
        const obligation = ObligationFactory.connect(obligationAddress, this.signer);
        return new ReadOnlyOptionPair(
            option,
            obligation,
            this.optionLib,
            this.collateral,
            this.treasury,
        );
    }

    listOptions(): Promise<string[]> {
        return this.optionFactory.allOptions();
    }
}

type WebProvider = InfuraProvider | Web3Provider;

export class ReadWriteContracts extends ReadOnlyContracts implements IWriteContracts {
    readonly account: string;
    readonly confirmations?: number;

    constructor(
        optionFactory: OptionPairFactory,
        optionLib: OptionLib,
        collateral: IERC20,
        treasury: ITreasury,
        referee: IReferee,
        relay: IRelay,
        signer: Signer,
        account: string,
        confirmations?: number,
    ) {
        super(optionFactory, optionLib, collateral, treasury, referee, relay, signer);
        this.account = account;
        this.confirmations = confirmations;
    }

    static async load(
        contracts: Addresses,
        signer: Signer,
        confirmations?: number,
    ): Promise<ReadWriteContracts> {
        const _optionFactory = OptionPairFactoryFactory.connect(contracts.optionFactory, signer);
        const _optionLib = OptionLibFactory.connect(contracts.optionLib, signer);
        const _collateral = IERC20Factory.connect(contracts.collateral, signer);
        const _treasuryAddress = await _optionFactory.getTreasury(_collateral.address);
        const _treasury = ITreasuryFactory.connect(_treasuryAddress, signer);
        const _referee = IRefereeFactory.connect(contracts.referee, signer);
        const _relay = IRelayFactory.connect(contracts.relay, signer);
        const account = await signer.getAddress();
        return new ReadWriteContracts(
            _optionFactory,
            _optionLib,
            _collateral,
            _treasury,
            _referee,
            _relay,
            signer,
            account,
            confirmations,
        );
    }

    static async resolve(provider: WebProvider, confirmations?: number): Promise<Optional<ReadWriteContracts>> {
        const addresses = await resolve(provider);
        return addresses ? this.load(addresses, provider.getSigner(), confirmations) : undefined;
    }

    // if this returns false we should call `approveMax`
    async checkAllowance(): Promise<boolean> {
        const amount = await this.collateral.allowance(this.account, this.optionLib.address);
        return amount.eq(ethers.constants.MaxUint256);
    }

    // in order to limit the number of transactions we need to
    // pre-approve our contracts to work with the max allowance
    approveMax() {
        return this.collateral.approve(
            this.optionLib.address, ethers.constants.MaxUint256)
    }
    
    // creates a european put option
    async createPair(
        expiryTime: BigNumberish,
        windowSize: BigNumberish,
        strikePrice: BigNumberish,
    ): Promise<IWriteOptionPair> {
        const optionAddress = await createPair(
            this.optionFactory, expiryTime, windowSize, strikePrice,
            this.collateral.address, this.referee.address, this.confirmations);
        return this.getPair(optionAddress);
    }

    async getPair(
        optionAddress: string,
    ): Promise<IWriteOptionPair> {
        const obligationAddress = await this.optionFactory.getObligation(optionAddress);
        const option = OptionFactory.connect(optionAddress, this.signer);
        const obligation = ObligationFactory.connect(obligationAddress, this.signer);
        return new ReadWriteOptionPair(
            option,
            obligation,
            this.optionLib,
            this.collateral,
            this.treasury,
            this.confirmations
        );
    }

    // persistent btcAddress across options
    async getBtcAddress(): Promise<BtcAddress> {
        const { btcHash, format } = await this.optionFactory.getBtcAddress();
        return { btcHash, format };
    }
}

export interface IReadOptionPair {
    getDetails(): Promise<{
        expiryTime: BigNumber,
        windowSize: BigNumber,
        strikePrice: BigNumber,
    }>;

    getBtcAddress(account: string, network: bitcoin.Network): Promise<string>;

    balanceOf(account: string): Promise<BigNumber>;
}

export interface IWriteOptionPair extends IReadOptionPair {
    write(
        premium: BigNumberish,
        amount: BigNumberish,
        btcAddress?: BtcAddress,
    ): Promise<void>;

    buy(
        amountOut: BigNumberish,
        amountInMax: BigNumberish,
        deadline: BigNumberish
    ): Promise<void>;

    requestExercise(
        seller: string,
        amount: BigNumberish,
    ): Promise<BigNumber>;

    executeExercise(
        seller: string,
        height: BigNumberish,
        index: BigNumberish,
        txid: Arrayish,
        proof: Arrayish,
        rawtx: Arrayish
    ): Promise<void>;

    refund(
        amount: BigNumberish,
    ): Promise<void>;
}

export class ReadOnlyOptionPair implements IReadOptionPair {
    protected option: Option;
    protected obligation: Obligation;
    protected optionLib: OptionLib;
    protected collateral: IERC20;
    protected treasury: ITreasury;

    constructor(
        option: Option,
        obligation: Obligation,
        optionLib: OptionLib,
        collateral: IERC20,
        treasury: ITreasury,
    ) {
        this.option = option;
        this.obligation = obligation;
        this.optionLib = optionLib;
        this.collateral = collateral;
        this.treasury = treasury;
    }

    async getDetails() {
        const [expiryTime, windowSize, strikePrice] = await Promise.all([
            this.option.expiryTime(),
            this.option.windowSize(),
            this.option.strikePrice(),
        ]);
        return ({ expiryTime, windowSize, strikePrice });
    }

    async getBtcAddress(account: string, network: bitcoin.Network): Promise<string> {
        const { btcHash, format } = await this.obligation.getBtcAddress(account);
        return encodeBtcAddress(btcHash.substr(2), format, network);
    }

    // gets the locked collateral for a pair
    async balanceOf(account: string) {
        return this.treasury.balanceOf(this.obligation.address, account)
    }
}

export class ReadWriteOptionPair extends ReadOnlyOptionPair implements IWriteOptionPair {
    readonly account: string;
    readonly confirmations?: number;

    constructor(
        option: Option,
        obligation: Obligation,
        optionLib: OptionLib,
        collateral: IERC20,
        treasury: ITreasury,
        confirmations?: number,
    ) {
        super(option, obligation, optionLib, collateral, treasury);
        this.confirmations = confirmations;
    }

    // back options with the default collateral
    // this also adds liquidity to the uniswap pool
    async write(
        premium: BigNumberish,
        amount: BigNumberish,
        btcAddress: BtcAddress,
    ): Promise<void> {
        await this.optionLib.lockAndWrite(
            this.option.address,
            this.collateral.address,
            this.collateral.address,
            amount,
            premium,
            amount,
            premium,
            btcAddress.btcHash,
            btcAddress.format
        ).then(tx => tx.wait(this.confirmations));
    }
    
    // buy order (i.e. specify exact number of options)
    async buy(
        amountOut: BigNumberish,
        amountInMax: BigNumberish,
        deadline: BigNumberish
    ): Promise<void> {
        await this.optionLib.swapTokensForExactTokens(
            amountOut,
            amountInMax,
            [this.collateral.address, this.option.address],
            this.account,
            deadline,
        ).then(tx => tx.wait(this.confirmations));
    }

    async requestExercise(
        seller: string,
        amount: BigNumberish
    ): Promise<BigNumber> {
        await this.option.requestExercise(seller, amount)
            .then(tx => tx.wait(this.confirmations));
        return this.obligation.getSecret(seller);
    }

    // prove inclusion and claim collateral
    async executeExercise(
        seller: string,
        height: BigNumberish,
        index: BigNumberish,
        txid: Arrayish,
        proof: Arrayish,
        rawtx: Arrayish
    ): Promise<void> {
        await this.option.executeExercise(
            seller, height, index, txid, proof, rawtx
        ).then(tx => tx.wait(this.confirmations));
    }

    // claim written collateral after expiry
    async refund(
        amount: BigNumberish,
    ): Promise<void> {
        await this.option.refund(amount)
            .then(tx => tx.wait(this.confirmations));
    }
}
