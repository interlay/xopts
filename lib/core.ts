import {ethers, Signer} from 'ethers';

export type Optional<T> = T | undefined;

export const Provider = ethers.providers.Provider;
export type Provider = ethers.providers.Provider;
export {Signer} from 'ethers';
export type SignerOrProvider = Signer | Provider;
