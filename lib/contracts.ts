import { ethers } from "@nomiclabs/buidler";
import { Signer, ContractTransaction } from "ethers";
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

// fetches writers (including those in pools) and calculates the amount owed
export async function calculatePayouts(obligation: Obligation, options: number) {
    const { accounts, balances, pools } = await obligation.getAccounts();
    const total = balances.reduce((prev, curr) => prev.add(curr));

    const owned = accounts.filter((acc, i) => !pools[i]).map((acc, i) => {
        return {
            account: acc,
            balance: balances[i],
        }
    });

    const pooled = accounts.filter((acc, i) => pools[i]);
    return Promise.all(pooled.map(acc => obligation.getPool(acc))).then(res => {
        return res.reduce((prev, curr) => {
            const { accounts, balances } = curr;
            prev.push(...accounts.map((acc, i) => {
                return {
                    account: acc,
                    balance: balances[i],
                }
            }));
            return prev;
        }, owned)
        
    }).then(res => res.map(acc => {
        return {
            account: acc.account,
            options: acc.balance.mul(options).div(total),
        };
    }));
}

// runs the callback after increasing the evm time, resets after
export async function evmSnapFastForward<R>(n: number, cb: () => Promise<R>) {
    const id = await ethers.provider.send("evm_snapshot", []);
    await ethers.provider.send("evm_increaseTime", [n]);
    await cb();
    await ethers.provider.send("evm_revert", [id]);
}

export async function createOption(
    optionFactory: OptionPairFactory,
    expiryTime: BigNumberish,
    windowSize: BigNumberish,
    strikePrice: BigNumberish,
    collateral: string,
    referee: string,
    confirmations?: number,
): Promise<string> {
    let topic = ethers.utils.id("Create(address,uint256,uint256,uint256)");
    // indexed parameters are not included in log data
    return optionFactory.createOption(expiryTime, windowSize, strikePrice, collateral, referee).then(tx =>
        tx.wait(confirmations).then(receipt => ethers.utils.defaultAbiCoder.decode(
            [ 'address' ], receipt.logs.find(log => log.topics.find(name => name == topic)).topics[1]
        )[0]));
}

export interface IContracts {
    checkAllowance(): Promise<boolean>;

    approveMax(): Promise<ContractTransaction>;

    createOption(
        expiryTime: BigNumberish,
        windowSize: BigNumberish,
        strikePrice: BigNumberish,
    ): Promise<IOptionPair>;

    writeOption(
        option: string,
        premium: BigNumberish,
        amount: BigNumberish,
        btcHash: Arrayish,
        format: Script
    ): Promise<void>;

    buyOption(
        option: string,
        amountOut: BigNumberish,
        amountInMax: BigNumberish
    ): Promise<void>;

    exerciseOption(
        option: string,
        seller: string,
        amount: BigNumberish,
        height: BigNumberish,
        index: BigNumberish,
        txid: Arrayish,
        proof: Arrayish,
        rawtx: Arrayish
    ): Promise<void>;

    refundOption(
        option: string,
        amount: BigNumberish,
    ): Promise<void>;
}

export class Contracts implements IContracts {
    confirmations: number;
    optionFactory: OptionPairFactory;
    optionLib: OptionLib;
    collateral: IERC20;
    treasury: ITreasury;
    referee: IReferee;
    relay: IRelay;
    signer: Signer;
    account: string;

    constructor(
        confirmations: number,
        optionFactory: OptionPairFactory,
        optionLib: OptionLib,
        collateral: IERC20,
        treasury: ITreasury,
        referee: IReferee,
        relay: IRelay,
        signer: Signer,
        account: string
    ) {
        this.confirmations = confirmations;
        this.optionFactory = optionFactory;
        this.optionLib = optionLib;
        this.collateral = collateral;
        this.treasury = treasury;
        this.referee = referee;
        this.relay = relay;
        this.signer = signer;
        this.account = account;
    }

    static async load(
        confirmations: number,
        optionFactory: string,
        optionLib: string,
        collateral: string,
        referee: string,
        relay: string,
        signer: Signer
    ): Promise<Contracts> {
        const _optionFactory = OptionPairFactoryFactory.connect(optionFactory, signer);
        const _optionLib = OptionLibFactory.connect(optionLib, signer);
        const _collateral = IERC20Factory.connect(collateral, signer);
        const _treasuryAddress = await _optionFactory.getTreasury(_collateral.address);
        const _treasury = ITreasuryFactory.connect(_treasuryAddress, signer);
        const _referee = IRefereeFactory.connect(referee, signer);
        const _relay = IRelayFactory.connect(relay, signer);
        const account = await signer.getAddress();
        return new Contracts(
            confirmations,
            _optionFactory,
            _optionLib,
            _collateral,
            _treasury,
            _referee,
            _relay,
            signer,
            account,
        );
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
    async createOption(
        expiryTime: BigNumberish,
        windowSize: BigNumberish,
        strikePrice: BigNumberish,
    ): Promise<IOptionPair> {
        const optionAddress = await createOption(
            this.optionFactory, expiryTime, windowSize, strikePrice,
            this.collateral.address, this.referee.address, this.confirmations);
        const obligationAddress = await this.optionFactory.getObligation(optionAddress);
        return new OptionPair(optionAddress, obligationAddress, this.treasury, this.signer, this.account);
    }

    // back options with the default collateral
    // this also adds liquidity to the uniswap pool
    async writeOption(
        option: string,
        premium: BigNumberish,
        amount: BigNumberish,
        btcHash: Arrayish,
        format: Script
    ): Promise<void> {
        await this.optionLib.lockAndWrite(
            option, premium, amount, btcHash, format
        ).then(tx => tx.wait(this.confirmations));
    }
    
    // buy order (i.e. specify exact number of options)
    async buyOption(
        option: string,
        amountOut: BigNumberish,
        amountInMax: BigNumberish
    ): Promise<void> {
        await this.optionLib.swapTokensForExactTokens(
            amountOut,
            amountInMax,
            this.collateral.address,
            option
        ).then(tx => tx.wait(this.confirmations));
    }

    // prove inclusion proof and claim collateral
    async exerciseOption(
        option: string,
        seller: string,
        amount: BigNumberish,
        height: BigNumberish,
        index: BigNumberish,
        txid: Arrayish,
        proof: Arrayish,
        rawtx: Arrayish
    ): Promise<void> {
        await this.optionFactory.exerciseOption(
            option, seller, amount, height, index, txid, proof, rawtx
        ).then(tx => tx.wait(this.confirmations));
    }

    // claim written collateral after expiry
    async refundOption(
        option: string,
        amount: BigNumberish,
    ): Promise<void> {
        await this.optionFactory.refundOption(option, amount)
            .then(tx => tx.wait(this.confirmations));
    }
}

export interface IOptionPair {
    getDetails(): Promise<{
        expiryTime: BigNumber,
        windowSize: BigNumber,
        strikePrice: BigNumber,
    }>;

    getPayouts(options: number): Promise<{
        account: string,
        options: BigNumber,
    }[]>;

    balance(obligation: string): Promise<{
        available: BigNumber;
        locked: BigNumber;
    }>;

    withdraw(amount: BigNumberish): Promise<ContractTransaction>;
}

export class OptionPair implements IOptionPair {
    option: Option;
    obligation: Obligation;
    treasury: ITreasury;
    signer: Signer;
    account: string;

    constructor(
        option: string,
        obligation: string,
        treasury: ITreasury,
        signer: Signer,
        account: string,
    ) {
        this.option = OptionFactory.connect(option, signer);
        this.obligation = ObligationFactory.connect(obligation, signer);
        this.treasury = treasury;
        this.signer = signer;
        this.account = account;
    }

    async getDetails() {
        const [expiryTime, windowSize, strikePrice] = await Promise.all([
            this.option.expiryTime(),
            this.option.windowSize(),
            this.option.strikePrice(),
        ]);
        return ({ expiryTime, windowSize, strikePrice });
    }

    // calculate amounts owed to each writer
    async getPayouts(options: number) {
        return calculatePayouts(this.obligation, options);
    }

    // gets the (un)locked collateral for a pair
    async balance() {
        const [locked, unlocked] = await Promise.all([
            this.treasury.balanceLocked(this.obligation.address, this.account),
            this.treasury.balanceUnlocked(this.obligation.address, this.account),
        ]);
        return ({
            // collateral available to withdraw
            available: unlocked,
            // collateral backing obligations
            locked: locked,
        });
    }

    // use this to withdraw collateral for sold obligations
    // i.e. if call above returns available, use this to recover funds
    withdraw(amount: BigNumberish) {
        return this.treasury.withdraw(this.obligation.address, amount);
    }
}
