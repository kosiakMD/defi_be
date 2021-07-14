import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import fetch from 'node-fetch';

import { Logger } from '../logger/logger.service';
import { AssetsStore } from '../store/assets.store';
import { AssetsEntity } from '../store/entities/assets.entity';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../util/util';
import { MigrationEvent } from './types/events';

@Injectable()
export class MigrationService {
  private readonly covalentUrl: string;
  private readonly covalentKey: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsStore: AssetsStore,
    private readonly configService: ConfigService,
  ) {
    this.covalentUrl = this.configService.get<string>('COVALENT_URL');
    this.covalentKey = this.configService.get<string>('COVALENT_KEY');
  }

  async migrateEvent(event: MigrationEvent): Promise<number> {
    const { userAddress, contractAddress, chainId } = event;

    const asset: AssetsEntity = await this.assetsStore.findByAddressAndChainId(
      event.contractAddress.toLowerCase(),
      event.chainId,
    );

    if (asset.isDataPresent) {
      return 1;
    }

    const assetPartial: Partial<AssetsEntity> = await this.getTokenInfo(
      userAddress.toLocaleLowerCase(),
      contractAddress.toLocaleLowerCase(),
      this.getCovalentChainId(chainId),
    );

    asset.name = assetPartial?.name;
    asset.decimals = assetPartial?.decimals;
    asset.symbol = assetPartial?.symbol;
    asset.icon = assetPartial?.icon;
    asset.isDataPresent = true;
    await this.assetsStore.save(asset);

    return 1;
  }

  async getTokenInfo(
    userAddress: string,
    contractAddress: string,
    chainId: number,
  ): Promise<Partial<AssetsEntity>> {
    const timeMark = `Request to ${this.covalentUrl} for tokenAddress: ${contractAddress}`;
    try {
      this.logger.time(timeMark);
      const data = await fetch(
        `${this.covalentUrl}/${chainId}/address/${userAddress}/transfers_v2/?contract-address=${contractAddress}&page-size=1&key=${this.covalentKey}`,
      );
      const json = await data.json();
      const transfer = json?.data?.items?.[0]?.transfers?.[0];
      this.logger.timeEnd(timeMark);

      return {
        name: transfer?.contract_name,
        decimals: transfer?.contract_decimals,
        symbol: transfer?.contract_ticker_symbol,
        icon: transfer?.logo_url,
      };
    } catch (e) {
      this.logger.timeEnd(timeMark);
      this.logger.error(e, 'getTokenInfo - from covalent');
      throw e;
    }
  }

  getCovalentChainId(chainId: number): number {
    switch (chainId) {
      case CHAIN_ID_ETH:
        return 1;
      case CHAIN_ID_BSC:
        return 56;
      default:
        1;
    }
  }
}
