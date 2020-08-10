import { OptionPairFactory } from "../typechain/OptionPairFactory";
import { BigNumberish, Signer, Contract, EventFilter, ContractTransaction } from "ethers";
import { createPair } from "../lib/contracts";
import { OptionFactory, ObligationFactory, TreasuryFactory } from "../typechain";
import { EventFragment } from "ethers/lib/utils";
import { Obligation } from "../typechain/Obligation";

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
