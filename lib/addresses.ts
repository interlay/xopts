import {utils, BigNumberish} from 'ethers';
import OptionArtifact from '../artifacts/contracts/Option.sol/Option.json';
import ObligationArtifact from '../artifacts/contracts/Obligation.sol/Obligation.json';
import {Optional, SignerOrProvider, Provider} from './core';

export interface Addresses {
  collateral: string;
  optionFactory: string;
  optionLib: string;
  relay: string;
  referee: string;
  writerRegistry: string;
}

type Network = 'buidler' | 'ganache' | 'hardhat';

export const Deployments: Record<Network, Addresses> = {
  buidler: {
    collateral: '0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F',
    optionFactory: '0x0078371BDeDE8aAc7DeBfFf451B74c5EDB385Af7',
    optionLib: '0xf784709d2317D872237C4bC22f867d1BAe2913AB',
    relay: '0x3619DbE27d7c1e7E91aA738697Ae7Bc5FC3eACA5',
    referee: '0x038B86d9d8FAFdd0a02ebd1A476432877b0107C8',
    writerRegistry: '0x1A1FEe7EeD918BD762173e4dc5EfDB8a78C924A8'
  },
  ganache: {
    collateral: '0x151eA753f0aF1634B90e1658054C247eFF1C2464',
    optionFactory: '0xA5f9310631CBEb4B7Ce1065Bd40042Ff5EF533F2',
    optionLib: '0x71dBe5Bd681c86d12211629EB19fE836149c6bf8',
    relay: '0xA7102d753442D827A853FeFE3DD88E182aea622D',
    referee: '0x5429c8fafa53b09386E41F07CbA2479C170faf0b',
    writerRegistry: '0x5Ee87DE59a4701B3d073be6244cdf7ddE32c8D49'
  },
  hardhat: {
    collateral: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    optionFactory: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    optionLib: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    relay: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    referee: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    writerRegistry: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6'
  }
};

type saltArgs = {
  expiryTime: number;
  windowSize: number;
  strikePrice: BigNumberish;
  collateral: string;
  referee: string;
};

export function getCreate2Address(
  salt: saltArgs,
  factory: string,
  bytecode: string
): string {
  return utils.getCreate2Address(
    factory,
    utils.keccak256(
      utils.solidityPack(
        ['uint256', 'uint256', 'uint256', 'address', 'address'],
        [
          salt.expiryTime,
          salt.windowSize,
          salt.strikePrice,
          salt.collateral,
          salt.referee
        ]
      )
    ),
    utils.keccak256(bytecode)
  );
}

export function getCreate2OptionAddress(
  salt: saltArgs,
  factory: string
): string {
  return getCreate2Address(salt, factory, OptionArtifact.bytecode);
}

export function getCreate2ObligationAddress(
  salt: saltArgs,
  factory: string
): string {
  return getCreate2Address(salt, factory, ObligationArtifact.bytecode);
}

function getProvider(signerOrProvider: SignerOrProvider): Optional<Provider> {
  if (signerOrProvider instanceof Provider) {
    return signerOrProvider;
  }
  return signerOrProvider.provider;
}

export async function resolveAddresses(
  signerOrProvider: SignerOrProvider
): Promise<Optional<Addresses>> {
  const provider = getProvider(signerOrProvider);
  if (!provider) {
    return;
  }
  const network = await provider.getNetwork();

  switch (network.chainId) {
    case 31337:
      // Buidlerevm
      return Deployments.buidler;
    case 2222:
      // Ganache
      return Deployments.ganache;
    case 1337:
      return Deployments.hardhat;
    default:
      return;
  }
}

export async function mustResolveAddresses(
  signerOrProvider: SignerOrProvider
): Promise<Addresses> {
  const addresses = await resolveAddresses(signerOrProvider);
  if (addresses !== undefined) {
    return addresses;
  }
  throw new Error('unknown network used');
}
