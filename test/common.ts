import { OptionPairFactory } from "../typechain/OptionPairFactory";
import { BigNumberish, Signer, Contract, EventFilter, ContractTransaction } from "ethers";
import { createPair } from "../lib/contracts";
import { OptionFactory, ObligationFactory, TreasuryFactory } from "../typechain";
import { EventFragment } from "ethers/lib/utils";

export function getTimeNow() {
    return Math.round((new Date()).getTime() / 1000);
}

export async function deployPair(
    optionFactory: OptionPairFactory,
    expiryTime: number,
    windowSize: number,
    strikePrice: BigNumberish,
    collateral: string,
    btcReferee: string,
    signer: Signer,
) {
  const optionAddress = await createPair(optionFactory, expiryTime, windowSize, strikePrice, collateral, btcReferee);
  const option = OptionFactory.connect(optionAddress, signer);

  const obligationAddress = await optionFactory.getObligation(option.address);
  const obligation = ObligationFactory.connect(obligationAddress, signer);

  return {option, obligation};
}

export async function getEvent<T extends any[]>(fragment: EventFragment, args: T, tx: ContractTransaction, contract: Contract) {
  const receipt = await tx.wait(0);
  const topics = contract.interface.encodeFilterTopics(fragment, args);
  const log = receipt.logs.find(log => log.topics.every((val, i) => val === topics[i]));
  return contract.interface.decodeEventLog(fragment, log.data);
}