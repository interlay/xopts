import { keccak256, solidityPack } from "ethers/utils";
import { utils } from "ethers";
import OptionArtifact from '../artifacts/Option.json';
import ObligationArtifact from '../artifacts/Obligation.json';

export interface Addresses {
    collateral: string;
    optionFactory: string;
    optionLib: string;
    relay: string;
    referee: string;
}

type Networks = "buidler" | "ganache";

export const Deployments: Record<Networks, Addresses> = {
    buidler: {
        collateral: "0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F",
        optionFactory: "0x0078371BDeDE8aAc7DeBfFf451B74c5EDB385Af7",
        optionLib: "0xf784709d2317D872237C4bC22f867d1BAe2913AB",
        relay: "0x3619DbE27d7c1e7E91aA738697Ae7Bc5FC3eACA5",
        referee: "0x038B86d9d8FAFdd0a02ebd1A476432877b0107C8",
    },
    ganache: {
        collateral: "0x151eA753f0aF1634B90e1658054C247eFF1C2464",
        optionFactory: "0xA5f9310631CBEb4B7Ce1065Bd40042Ff5EF533F2",
        optionLib: "0x71dBe5Bd681c86d12211629EB19fE836149c6bf8",
        relay: "0xA7102d753442D827A853FeFE3DD88E182aea622D",
        referee: "0x5429c8fafa53b09386E41F07CbA2479C170faf0b",
    }
}

type saltArgs = {
    expiryTime: number,
    windowSize: number,
    strikePrice: number,
    collateral: string,
    referee: string,
}

export function getCreate2Address(
    salt: saltArgs,
    factory: string,
    bytecode: string,
) {
    return utils.getCreate2Address({
        from: factory,
        salt: keccak256(solidityPack(
            ["uint256", "uint256", "uint256", "address", "address"],
            [
                salt.expiryTime, salt.windowSize, salt.strikePrice, 
                salt.collateral, salt.referee
            ]
        )),
        initCodeHash: keccak256(bytecode),
    });
}

export function getCreate2OptionAddress(
    salt: saltArgs,
    factory: string,
) {
    return getCreate2Address(
        salt,
        factory,
        OptionArtifact.bytecode
    );
}

export function getCreate2ObligationAddress(
    salt: saltArgs,
    factory: string,
) {
    return getCreate2Address(
        salt,
        factory,
        ObligationArtifact.bytecode
    );
}