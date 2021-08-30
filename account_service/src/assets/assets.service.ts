import { plainToClass } from 'class-transformer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Address, Chains, DetailedResponse } from '../common/interfaces';
import { ChainIdEnum, ResultStatus } from 'src/common/enum';

import { Logger } from '../Logger/Logger.service';
import { AssetsRepository } from './assets.repository';
import { AssetDto, AssetResponseDto } from './dto/asset.dto';
import { AssetsPoolsDto, AssetsPoolsPostResponseDto } from './dto/assetsPoolsDto';
import { AssetsEntity } from './entity/assets.entity';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(AssetsRepository) private readonly assetRepository: AssetsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}
  async queryAllAssets(): Promise<AssetDto[]> {
    try {
      const storedAssets: AssetsEntity[] = await this.assetRepository.findAll();
      return storedAssets.map((asset) =>
        plainToClass(AssetDto, asset, { excludeExtraneousValues: true }),
      );
    } catch (e) {
      this.logger.error(e, 'AssetsService.queryAllAssets');
      throw e;
    }
  }

  async findByAddressAndChain(address: Address, chainId: ChainIdEnum): Promise<AssetsEntity> {
    return await this.assetRepository.findOneByAddressAndChain(address, chainId);
  }

  async getAssetObjectsForLambda(chainId: ChainIdEnum): Promise<AssetsPoolsDto[]> {
    const assetsPools = await this.assetRepository.findAllTrackedAssetsWithPoolsByChain(chainId);
    return assetsPools.map((pool) => plainToClass(AssetsPoolsDto, pool));
  }

  async getAllAssetsByAddressesAndChains(
    addresses: Address[],
    chains: Chains,
  ): Promise<DetailedResponse<AssetResponseDto[]>> {
    const response = {
      status: ResultStatus.ok,
      errors: [],
      data: [],
    };

    try {
      const timeMark = `Query to asset_new table with addresses: ${addresses} and chains: ${chains}`;
      this.logger.time(timeMark);
      const assets = await this.assetRepository.findAllByAddressesAndChains(addresses, chains);
      this.logger.timeEnd(timeMark);
      response.data.push(
        ...assets.map((asset) =>
          plainToClass(AssetResponseDto, asset, { excludeExtraneousValues: true }),
        ),
      );
    } catch (e) {
      if (e.response) {
        response.errors.push(e.response.data.message);
        this.logger.error(e.response.data, 'getAllAssetsByAddressesAndChains');
      } else {
        response.errors.push(e);
        this.logger.error(e, 'getAllAssetsByAddressesAndChains');
      }
    }
    if (response.errors.length) {
      response.status = ResultStatus.error;
    }
    return response;
  }

  static getResponseObject(flag?: boolean): AssetsPoolsPostResponseDto {
    return flag
      ? new AssetsPoolsPostResponseDto(
          HttpStatus.CREATED,
          'AssetsPools were successfully saved to DB',
        )
      : new AssetsPoolsPostResponseDto(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Saving of assetsPools failed',
        );
  }
}
