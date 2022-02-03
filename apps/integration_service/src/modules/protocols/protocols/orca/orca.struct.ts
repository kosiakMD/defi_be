import { publicKey, u64 } from '@project-serum/borsh';
import BN from 'bn.js';
import { struct, u8, blob } from 'buffer-layout';
import Decimal from 'decimal.js';

const uint256 = (property = 'uint256') => {
  return blob(32, property);
};

export function uint256ToDecimal(data: any) {
  return new Decimal(new BN(data, 10, 'le').toString()).dividedBy('1_000_000_000_000');
}

export const globalFarmStruct = struct([
  u8('isInitialized'),
  u8('accountType'),
  u8('nonce'),
  publicKey('tokenProgramId'),
  publicKey('emissionsAuthority'),
  publicKey('removeRewardsAuthority'),
  publicKey('baseTokenMint'),
  publicKey('baseTokenVault'),
  publicKey('rewardTokenVault'),
  publicKey('farmTokenMint'),
  u64('emissionsPerSecondNumerator'),
  u64('emissionsPerSecondDenominator'),
  u64('lastUpdatedTimestamp'),
  uint256('cumulativeEmissionsPerFarmToken'),
]);

export const userFarmStruct = struct([
  u8('isInitialized'),
  u8('accountType'),
  publicKey('globalFarm'),
  publicKey('owner'),
  u64('baseTokensConverted'),
  uint256('cumulativeEmissionsCheckpoint'),
]);
