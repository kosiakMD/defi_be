import { Mirror, MirrorMint } from '@mirror-protocol/mirror.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger, ProjectEnum, ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { BaseDataMint, IntegrationMintPositionDto } from '@app/common/dto/base.data.mint';
import { IntegrationERC20TokenDto } from '@app/common/jobs/staking';

import { toDecimals } from '../../../../common/utils/util';

import { AccountService } from '../../../microservice/account.service';
import { MirrorAddresses } from './mirror.addresses';

import PositionResponse = MirrorMint.PositionResponse;

@Injectable()
export class MirrorMintService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const positions = await this.getUserPositions(addresses);
    const tokensAddresses: string[] = Array.from(positions.values()).flatMap((userPositions) => {
      return Array.from(userPositions.values()).map(
        (position) => position.asset.info.token.contract_addr,
      );
    });
    tokensAddresses.push(MirrorAddresses.terraUsd);

    const { data } = await this.accountService.getAssets(tokensAddresses, [chain.id]);
    const tokensMap = data.reduce((resp, asset) => {
      resp.set(asset.address, asset);
      return resp;
    }, new Map());

    const baseDataMintMap: Map<string, BaseDataMint> = new Map<string, BaseDataMint>(
      addresses.map((a) => [a, this.getMintBaseData(a, chain)]),
    );

    for (const [key, value] of positions) {
      const mintBaseData = baseDataMintMap.get(key);
      value.forEach((position) => {
        const ust = tokensMap.get(MirrorAddresses.terraUsd);
        const mintDb = tokensMap.get(position.asset.info.token.contract_addr);
        const collateral = plainToClass(IntegrationERC20TokenDto, {
          address: ust.address,
          name: ust.name,
          symbol: ust.symbol,
          decimals: ust.decimals,
          balance: toDecimals(position.collateral.amount, ust.decimals),
        });
        const mintedToken = plainToClass(IntegrationERC20TokenDto, {
          address: mintDb.address,
          name: mintDb.name,
          symbol: mintDb.symbol,
          decimals: mintDb.decimals,
          balance: toDecimals(position.asset.amount, mintDb.decimals),
        });

        mintBaseData.items.push(
          plainToClass(IntegrationMintPositionDto, {
            mintedToken: mintedToken,
            collateral: collateral,
          }),
        );
      });
    }

    return Array.from(baseDataMintMap.values());
  }

  private async getUserPositions(addresses: string[]): Promise<Map<string, PositionResponse[]>> {
    try {
      const mirror = new Mirror();
      const positionsMap = new Map<string, PositionResponse[]>();

      await Promise.all(
        addresses.map(async (address) => {
          const { positions } = await mirror.mint.getPositions(address);
          if (positions.length) {
            positionsMap.set(address, positions);
          }
        }),
      );
      return positionsMap;
    } catch (e) {
      this.logger.error(e, 'getUserPositions');
    }
  }

  getMintBaseData(address: string, chain: ChainDto) {
    return plainToClass(BaseDataMint, {
      chain: chain,
      userAddress: address,
      protocolType: ProtocolTypeEnum.mint,
      projectName: ProjectEnum.mirror,
      feature: FeatureEnum.mint,
      items: [],
    });
  }
}
