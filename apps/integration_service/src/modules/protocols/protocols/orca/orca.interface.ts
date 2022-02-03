import type Decimal from 'decimal.js';

import type { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

export interface userFarmData {
  isInitialized: string;
  accountType: string;
  globalFarm: string;
  owner: string;
  baseTokensConverted: string;
  cumulativeEmissionsCheckpoint: Decimal;
}

export interface globalFarmData {
  isInitialized: string;
  accountType: string;
  nonce: string;
  tokenProgramId: string;
  emissionsAuthority: string;
  removeRewardsAuthority: string;
  baseTokenMint: string;
  baseTokenVault: string;
  rewardTokenVault: string;
  farmTokenMint: string;
  emissionsPerSecondNumerator: string;
  emissionsPerSecondDenominator: string;
  lastUpdatedTimestamp: string;
  cumulativeEmissionsPerFarmToken: Decimal;
  totalDeposit: string;
}

export interface modifiedBalanceData {
  balance: userFarmData[];
  pool: IntegrationStakingPositionDto;
  farm: globalFarmData[];
}
