import {OptionPairFactory} from '../typechain/OptionPairFactory';
import {BigNumberish, Signer, constants} from 'ethers';
import {createPair, deploy2} from '../lib/contracts';
import {OptionFactory, ObligationFactory, TreasuryFactory} from '../typechain';
import {Obligation} from '../typechain/Obligation';
import {Option} from '../typechain/Option';
import {Treasury} from '../typechain/Treasury';

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
  treasury: Treasury;
}> {
  const treasuryAddress = await optionFactory.getTreasury(collateral);
  let treasury: Treasury;
  if (treasuryAddress === constants.AddressZero) {
    treasury = await deploy2(
      signer,
      TreasuryFactory,
      collateral,
      optionFactory.address
    );
    await optionFactory.setTreasuryFor(collateral, treasury.address);
  } else {
    treasury = TreasuryFactory.connect(treasuryAddress, signer);
  }

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
  const obligation = ObligationFactory.connect(
    pairAddresses.obligation,
    signer
  );

  return {option, obligation, treasury};
}
