import {OptionPairFactory} from '../typechain/OptionPairFactory';
import {BigNumberish, Signer} from 'ethers';
import {createPair} from '../lib/contracts';
import {OptionFactory, ObligationFactory} from '../typechain';
import {Obligation} from '../typechain/Obligation';
import {Option} from '../typechain/Option';

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
  await optionFactory.enableAsset(collateral);
  const pairAddresses = await createPair(
    optionFactory,
    expiryTime,
    windowSize,
    strikePrice,
    collateral,
    btcReferee
  );
  const option = OptionFactory.connect(pairAddresses.option, signer);

  const obligationAddress = await optionFactory.getObligation(option.address);
  const obligation = ObligationFactory.connect(obligationAddress, signer);

  return {option, obligation};
}
