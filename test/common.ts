import {OptionPairFactory} from '../typechain/OptionPairFactory';
import {BigNumberish, Signer, Contract, ContractTransaction} from 'ethers';
import {createPair} from '../lib/contracts';
import {OptionFactory, ObligationFactory} from '../typechain';
import {EventFragment, Result} from 'ethers/lib/utils';
import {Option} from '../typechain/Option';
import {Obligation} from '../typechain/Obligation';

export function getTimeNow(): number {
  return Math.round(new Date().getTime() / 1000);
}

export async function deployPair(
  optionFactory: OptionPairFactory,
  expiryTime: number,
  windowSize: number,
  strikePrice: BigNumberish,
  collateral: string,
  btcReferee: string,
  signer: Signer
): Promise<{
  option: Option;
  obligation: Obligation;
}> {
  const optionAddress = await createPair(
    optionFactory,
    expiryTime,
    windowSize,
    strikePrice,
    collateral,
    btcReferee
  );
  const option = OptionFactory.connect(optionAddress, signer);

  const obligationAddress = await optionFactory.getObligation(option.address);
  const obligation = ObligationFactory.connect(obligationAddress, signer);

  return {option, obligation};
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getEvent<T extends any[]>(
  fragment: EventFragment,
  args: T,
  tx: ContractTransaction,
  contract: Contract
): Promise<Result> {
  const receipt = await tx.wait(0);
  const topics = contract.interface.encodeFilterTopics(fragment, args);
  const log = receipt.logs.find((log) =>
    log.topics.every((val, i) => val === topics[i])
  )!;
  return contract.interface.decodeEventLog(fragment, log.data);
}
