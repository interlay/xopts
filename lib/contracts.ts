import { ethers } from "@nomiclabs/buidler";
import { Signer } from "ethers";
import { Obligation } from "../typechain/Obligation";

interface Attachable<C> {
    attach(addr: string): C;
}

interface Callable {
    address: string;
}

export function reattach<C extends Callable, A extends Attachable<C>>(contract: C, factory: new (from: Signer) => A, signer: Signer): C {
    let _factory = new factory(signer);
    return _factory.attach(contract.address);
}

interface Deployable<A, C> {
    deploy(arg: A): Promise<C>;
}

export function deploy<A, C extends Callable, D extends Deployable<A, C>>(signer: Signer, factory: new (signer: Signer) => D, arg?: A) {
    const _factory = new factory(signer);
    return _factory.deploy(arg);
}

export async function calculatePayouts(obligation: Obligation, signer: Signer, options: number) {
    const { writers, tokens } = await obligation.getAllObligations();
    const total = tokens.reduce((prev, curr) => prev.add(curr))
    return writers.map((acc, i) => {
        return {
            writer: acc,
            options: tokens[i].mul(options).div(total),
        };
    });
}

export async function evmSnapFastForward<R>(n: number, cb: () => Promise<R>) {
    const id = await ethers.provider.send("evm_snapshot", []);
    await ethers.provider.send("evm_increaseTime", [n]);
    await cb();
    await ethers.provider.send("evm_revert", [id]);
}