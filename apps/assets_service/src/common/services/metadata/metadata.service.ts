import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { Connection } from '@solana/web3.js';
import { LCDClient } from '@terra-money/terra.js';
import Web3 from 'web3';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AbsoluteChainIdEnum, ChainIdEnum } from '@app/common/enum';

import { AssetMetadata } from '../../types/asset-metadata.type';
import { EVMMetaDataStrategy } from './strategies/EVM.strategy';
import { CardanoMetadataStrategy } from './strategies/cardano.strategy';
import { CosmosMetadataStrategy } from './strategies/cosmos.strategy';
import { SolanaMetadataStrategy } from './strategies/solana.strategy';
import { TerraMetadataStrategy } from './strategies/terra.strategy';

const ChainsProvidersUrls = {
  [ChainIdEnum.arbi]: 'ARBITRUM_URL',
  [ChainIdEnum.avax]: 'AVAX_URL',
  [ChainIdEnum.boba]: 'BOBA_URL',
  [ChainIdEnum.bnb]: 'BSC_URL',
  [ChainIdEnum.celo]: 'CELO_URL',
  [ChainIdEnum.cro]: 'CRONOS_URL',
  [ChainIdEnum.eth]: 'ETH_URL',
  [ChainIdEnum.ftm]: 'FTM_URL',
  [ChainIdEnum.harm]: 'HARM_URL',
  [ChainIdEnum.heco]: 'HECO_URL',
  [ChainIdEnum.kcc]: 'KCC_URL',
  [ChainIdEnum.mriver]: 'MRIVER_URL',
  [ChainIdEnum.okex]: 'OKEX_URL',
  [ChainIdEnum.opt]: 'OPT_URL',
  [ChainIdEnum.plg]: 'POLYGON_URL',
  [ChainIdEnum.near]: 'NEAR_URL',
  [ChainIdEnum.klay]: 'KLAYTN_URL',
  [ChainIdEnum.fuse]: 'FUSE_URL',
  [ChainIdEnum.gnosis]: 'GNOSIS_URL',
};

@Injectable()
export class MetadataService {
  private readonly providers = {};

  constructor(private readonly configService: ConfigService, private http: HttpService) {
    this.initWeb3Providers();
  }

  public async getMetadata(address: string, chainId: number | string): Promise<AssetMetadata> {
    let metadataStrategy;
    switch (chainId) {
      case ChainIdEnum.sol:
        metadataStrategy = new SolanaMetadataStrategy(this.http);
        break;
      case ChainIdEnum.terra:
        metadataStrategy = new TerraMetadataStrategy();
        break;
      case ChainIdEnum.cardano:
        metadataStrategy = new CardanoMetadataStrategy();
        break;
      case ChainIdEnum.cosmos:
      case ChainIdEnum.kava:
      case ChainIdEnum.osmosis:
      case ChainIdEnum.secret:
        metadataStrategy = new CosmosMetadataStrategy(this.http);
        break;
      default:
        metadataStrategy = new EVMMetaDataStrategy();
    }

    return metadataStrategy.getMetadata(
      address,
      Number(chainId),
      this.getInstanceByChainId(chainId),
    );
  }

  public getInstanceByChainId(chain: ChainIdEnum | string) {
    chain = chain.toString();
    return this.providers[chain];
  }

  private initWeb3Providers() {
    Object.entries(ChainsProvidersUrls).forEach(([chainId, configName]) => {
      this.providers[chainId] = new Web3(this.configService.get<string>(configName));
    });

    this.providers[ChainIdEnum.sol] = new Connection(this.configService.get<string>('SOL_URL'));
    this.providers[ChainIdEnum.terra] = new LCDClient({
      URL: this.configService.get<string>('TERRA_URL'),
      chainID: AbsoluteChainIdEnum.terra.toString(),
    });

    this.providers[ChainIdEnum.cardano] = new BlockFrostAPI({
      projectId: this.configService.get<string>('CARDANO_BLOCKFROST_API_KEY'),
    });
  }
}
