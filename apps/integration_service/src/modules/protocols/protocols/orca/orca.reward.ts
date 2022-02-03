import { u64 } from '@solana/spl-token';
import BN from 'bn.js';
import Decimal from 'decimal.js';

import { globalFarmData, userFarmData } from './orca.interface';

export async function calculateRewards(balance: userFarmData, infoFarmPool: globalFarmData) {
  const cumulativeEmissionsDelta = infoFarmPool.cumulativeEmissionsPerFarmToken.sub(
    balance.cumulativeEmissionsCheckpoint,
  );

  const getHarvestableAmount = new u64(
    new Decimal(balance.baseTokensConverted.toString())
      .mul(cumulativeEmissionsDelta)
      .floor()
      .toString(),
  );

  const elapsedTimeInSeconds = new u64(Date.now() / 1000).sub(
    new BN(infoFarmPool.lastUpdatedTimestamp),
  );

  const getCurrentHarvestableAmount = new BN(infoFarmPool.emissionsPerSecondNumerator)
    .mul(elapsedTimeInSeconds)
    .mul(new BN(balance.baseTokensConverted))
    .div(new BN(infoFarmPool.emissionsPerSecondDenominator))
    .div(new BN(infoFarmPool.totalDeposit))
    .add(getHarvestableAmount);

  return getCurrentHarvestableAmount.toString();
}
