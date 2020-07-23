import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet, Contract } from "ethers";
import { BigNumber } from "ethers/utils";
import { contracts } from "../index";
import { legos } from "@studydefi/money-legos";
import { solidity } from "ethereum-waffle";
import chai from "chai";

chai.use(solidity);
const { expect } = chai;

export const fromWei = (x: BigNumber, u = 18) => ethers.utils.formatUnits(x, u);

export const generateDai = async function(user:Signer, userAddress: string, collateralAmount: number, collateral: Contract) {
    const proxyRegistry = await ethers.getContractAt(
        legos.maker.proxyRegistry.abi,
        contracts.ropsten.proxyRegistry,
        user
    );
    let proxyAddress = await proxyRegistry.proxies(userAddress);
    if (proxyAddress === "0x0000000000000000000000000000000000000000") {
        await proxyRegistry.build({ gasLimit: 1500000 });
        proxyAddress = await proxyRegistry.proxies(userAddress);
    }

    const proxyContract = await ethers.getContractAt(
        legos.dappsys.dsProxy.abi,
        proxyAddress,
        user
    );
    console.log("Proxy contract: ", proxyContract.address);
    const IDssProxyActions = new ethers.utils.Interface(
        legos.maker.dssProxyActions.abi,
    );

    const _data = IDssProxyActions.functions.openLockETHAndDraw.encode([
        contracts.ropsten.cdpManager,
        contracts.ropsten.jug,
        contracts.ropsten.join_eth_A,
        contracts.ropsten.join_dai,
        ethers.utils.formatBytes32String(legos.maker.ethA.symbol),
        ethers.utils.parseUnits("20", legos.erc20.dai.decimals),
    ]);

    const ethBefore = await ethers.provider.getBalance(userAddress);
    const daiBefore = await collateral.balanceOf(userAddress);
    console.log("ETH balance before: ", ethBefore.toString());
    console.log("Dai balance before: ", daiBefore.toString());

    // Open vault through proxy
    await proxyContract.execute(contracts.ropsten.dssProxyActions, _data, {
        gasLimit: 2500000,
        value: ethers.utils.parseEther("1"),
    });

    const ethAfter = await ethers.provider.getBalance(userAddress);
    const daiAfter = await collateral.balanceOf(userAddress);
    console.log("ETH balance after: ", ethAfter.toString());
    console.log("Dai balance after: ", daiAfter.toString());

    const ethSpent = parseFloat(fromWei(ethBefore.sub(ethAfter)));
    const daiGained = parseFloat(fromWei(daiAfter.sub(daiBefore)));

    expect(ethSpent).to.be.closeTo(1, 1);
    expect(daiGained).to.be.closeTo(20, 1);
}
