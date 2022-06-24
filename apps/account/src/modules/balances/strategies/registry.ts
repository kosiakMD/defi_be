import { ChainId, ChainIdEnum } from '@app/common';

import { CardanoBalancesStrategy } from './cardano.balances.strategy';
import { CosmosBalancesStrategy } from './cosmos.balances.strategy';
import { CovalentBalancesStrategy } from './covalent.strategy';
import { KavaBalancesStrategy } from './kava.balances.strategy';
import { NetworkBalancesStrategy } from './network.strategy';
import { OsmosisBalancesStrategy } from './osmosis.balances.strategy';
import { RoninBalancesStrategy } from './ronin.balances.strategy';
import { SecretBalancesStrategy } from './secret.balances.strategy';
import { SolanaBalancesStrategy } from './solana.balances.strategy';
import { TerraBalancesStrategy } from './terra.balances.strategy';

export const balanceStrategies = [
  NetworkBalancesStrategy,
  CovalentBalancesStrategy,
  SolanaBalancesStrategy,
  TerraBalancesStrategy,
  CardanoBalancesStrategy,
  CosmosBalancesStrategy,
  KavaBalancesStrategy,
  OsmosisBalancesStrategy,
  SecretBalancesStrategy,
  RoninBalancesStrategy,
];

export function getStrategyForNetwork(chainId: ChainId) {
  switch (chainId) {
    case ChainIdEnum.sol:
      return SolanaBalancesStrategy;
    case ChainIdEnum.terra:
      return TerraBalancesStrategy;
    case ChainIdEnum.cardano:
      return CardanoBalancesStrategy;
    case ChainIdEnum.cosmos:
      return CosmosBalancesStrategy;
    case ChainIdEnum.kava:
      return KavaBalancesStrategy;
    case ChainIdEnum.osmosis:
      return OsmosisBalancesStrategy;
    case ChainIdEnum.secret:
      return SecretBalancesStrategy;
    case ChainIdEnum.ronin:
      return RoninBalancesStrategy;
    default:
      return NetworkBalancesStrategy;
  }
}
