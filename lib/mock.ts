import { ethers } from "@nomiclabs/buidler";

export const MockSigner = () => ethers.Wallet.createRandom();

// runs the callback after increasing the evm time, resets after
export async function evmSnapFastForward<R>(n: number, cb: () => Promise<R>) {
    const id = await ethers.provider.send("evm_snapshot", []);
    await ethers.provider.send("evm_increaseTime", [n]);
    await cb();
    await ethers.provider.send("evm_revert", [id]);
}