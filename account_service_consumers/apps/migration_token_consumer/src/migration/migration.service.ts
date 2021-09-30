import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import fetch from 'node-fetch';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AssetService } from '../chain/asset.service';
import { Logger } from '../logger/logger.service';
import { AssetsStore } from '../store/assets.store';
import { AssetsEntity } from '../store/entities/assets.entity';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../util/util';
import { MigrationEvent } from './types/events';

@Injectable()
export class MigrationService {
  private readonly covalentUrl: string;
  private readonly covalentKey: string;
  private readonly ethplorerUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsStore: AssetsStore,
    private readonly configService: ConfigService,
    private readonly assetService: AssetService,
  ) {
    this.covalentUrl = this.configService.get<string>('COVALENT_URL');
    this.covalentKey = this.configService.get<string>('COVALENT_KEY');
    this.ethplorerUrl = this.configService.get<string>('ETHPLORER_URL');
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
      userAddress?.toLocaleLowerCase(),
      contractAddress.toLocaleLowerCase(),
      this.getCovalentChainId(chainId),
    );

    asset.name = this.normalizeWeb3TokensData(assetPartial?.name);
    asset.decimals = assetPartial?.decimals;
    asset.symbol = this.normalizeWeb3TokensData(assetPartial?.symbol);
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
    const tokenInfoTimeMark = `Trying to get token information for tokenAddress: ${contractAddress}`;
    const errorMessage = `There is no information about token: ${contractAddress} --- "getTokenInfo"`;
    this.logger.time(tokenInfoTimeMark);

    // try to get token info from covalent
    try {
      // i deleted check of token info here because inside of getCovalentToken method there is the same check
      return await this.getCovalentToken(userAddress, contractAddress, chainId);
    } catch (e) {
      //
    }

    // try to get token info from web3.js
    const web3TimeMark = `Request to web3.js for tokenAddress: ${contractAddress}`;
    try {
      this.logger.time(web3TimeMark);
      const token = await this.assetService.getTokenInfo(contractAddress, chainId);
      if (token?.symbol && token?.decimals && token?.name) {
        return token;
      }
    } catch (e) {
      //
    } finally {
      this.logger.timeEnd(web3TimeMark);
    }

    // try to get token info from ethplorer. only for ethereum tokens
    if (chainId === CHAIN_ID_ETH) {
      const ethplorerTimeMark = `Request to ${this.ethplorerUrl} for tokenAddress: ${contractAddress}`;

      this.logger.time(ethplorerTimeMark);
      const token = await this.getEthplorerToken(contractAddress);
      this.logger.timeEnd(tokenInfoTimeMark);
      if (token?.symbol && token?.decimals && token?.name) {
        return token;
      }
      throw new Error(errorMessage);
    }
    throw new Error(errorMessage);
  }

  async getCovalentToken(
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

      if (
        !transfer?.contract_name ||
        !transfer?.contract_decimals ||
        !transfer?.contract_ticker_symbol
      ) {
        throw new Error('no data returns from covalent');
      }

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

  async getEthplorerToken(contractAddress: string): Promise<Partial<AssetsEntity>> {
    try {
      const data = await fetch(
        `${this.ethplorerUrl}/getTokenInfo/${contractAddress}?apiKey=freekey`,
      );
      if (!data.ok) {
        throw new Error('response is not 200');
      }
      const json = await data.json();

      return {
        name: json?.name,
        decimals: json?.decimals,
        symbol: json?.symbol,
        icon: `https://ethplorer.io${json?.image}`,
      };
    } catch (e) {
      this.logger.error(e, 'getTokenInfo - from ethplorer');
      throw e;
    }
  }

  replaceAll(string, search, replace): string {
    return string.split(search).join(replace);
  }

  normalizeWeb3TokensData(data: string): string {
    return this.replaceAll(data, '\u0000', '');
  }
}
