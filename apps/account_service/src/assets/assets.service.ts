import { plainToClass } from 'class-transformer';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ChainIdEnum, ResultStatus } from '@app/common/enum';
import { DetailedResponse } from '@app/common/interfaces';
import { Address, Chains } from '@app/common/types';

import { LIKE_CURVE_LP } from '../chain/contracts/LIKE_CURVE_LP';
import { MINTER } from '../chain/contracts/MINTER';
import { UNIV2LP } from '../chain/contracts/UNIV2LP';
import { Web3Provider } from '../chain/web3.provider';
import { ellipsisPoolsMap } from '../utils/utils';
import { AssetsRepository } from './assets.repository';
import { AssetDto, AssetResponseDto } from './dto/asset.dto';
import { AssetsPoolsDto, AssetsPoolsPostResponseDto } from './dto/assets.pools.dto';
import { AssetsEntity } from './entity/assets.entity';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(AssetsRepository) private readonly assetRepository: AssetsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly web3Provider: Web3Provider,
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

  // TODO: Review this method
  async getAssetAndPoolObjects(chainId: ChainIdEnum): Promise<AssetsPoolsDto[]> {
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

  async saveTrackingAsset({ assetAddress, assetChain }): Promise<any> {
    const existedAsset: AssetsEntity = await this.assetRepository.findOneByAddressAndChain(
      assetAddress,
      assetChain,
    );

    if (existedAsset && (existedAsset.isTracked || existedAsset.isLp)) {
      return this.withUnderlying(existedAsset);
    }

    const chainProvider = this.web3Provider.getInstanceByChainId(assetChain);
    // bind asset to LP token contract because it extends from ERC20 by default
    const assetContract = new UNIV2LP(assetAddress, chainProvider);
    const assetData = await assetContract.getContractData();

    let assetToSave: AssetsEntity;
    if (existedAsset) {
      assetToSave = existedAsset;
    } else {
      assetToSave = new AssetsEntity();
      assetToSave.chain = assetChain;
      assetToSave.address = assetAddress;
      assetToSave.icon = null;
      assetToSave.isLp = false;
      assetToSave.isAnalyticAvailable = false;
      assetToSave = await this.assetRepository.saveAsset(assetToSave);
    }
    assetToSave.name = assetData.name;
    assetToSave.symbol = assetData.symbol;
    assetToSave.decimals = assetData.decimals;
    // define is token LP
    try {
      await assetContract.getReserves();
      const [token0Address, token1Address] = await Promise.all([
        assetContract.token0(),
        assetContract.token1(),
      ]);
      // save underlying assets to database and start track them
      const [token0, token1] = await Promise.all([
        this.saveTrackingAsset({
          assetAddress: token0Address,
          assetChain: assetChain,
        }),
        this.saveTrackingAsset({
          assetAddress: token1Address,
          assetChain: assetChain,
        }),
      ]);
      // create relations between lp token and underlying tokens
      await Promise.all([
        this.assetRepository.createRelation(assetToSave.id, token0.id, 0),
        this.assetRepository.createRelation(assetToSave.id, token1.id, 1),
      ]);
      assetToSave.isLp = true;
      // eslint-disable-next-line no-empty
    } catch (e) {}

    // we don't track lp tokens, we track underlying tokens only
    assetToSave.isTracked = assetToSave.isLp !== true;
    assetToSave = await this.assetRepository.saveAsset(assetToSave);

    return this.withUnderlying(assetToSave);
  }

  async saveLikeCurveTrackingAsset({ assetAddress, assetChain }) {
    const existedAsset: AssetsEntity = await this.assetRepository.findOneByAddressAndChain(
      assetAddress,
      assetChain,
    );

    if (existedAsset && (existedAsset.isTracked || existedAsset.isLp)) {
      return this.withUnderlying(existedAsset);
    }
    const chainProvider = this.web3Provider.getInstanceByChainId(assetChain);
    // bind asset to LP token contract because it extends from ERC20 by default
    const assetContract = new LIKE_CURVE_LP(assetAddress, chainProvider);
    const assetData = await assetContract.getContractData();

    let assetToSave: AssetsEntity;
    if (existedAsset) {
      assetToSave = existedAsset;
    } else {
      assetToSave = new AssetsEntity();
      assetToSave.chain = assetChain;
      assetToSave.address = assetAddress;
      assetToSave.icon = null;
      assetToSave.isLp = false;
      assetToSave.isAnalyticAvailable = false;
      assetToSave = await this.assetRepository.saveAsset(assetToSave);
    }
    assetToSave.name = assetData.name;
    assetToSave.symbol = assetData.symbol;
    assetToSave.decimals = assetData.decimals;

    const minterAddress = await assetContract.minter();
    const minterContract = new MINTER(minterAddress, chainProvider);

    const underlyingCoins = [];
    const lpData = ellipsisPoolsMap.get(assetToSave.address);
    for (let i = 0; i < lpData.coins; i++) {
      try {
        const coin = await minterContract.coins(i);
        underlyingCoins.push(coin.toLowerCase());
      } catch (e) {}
    }

    if (underlyingCoins.length) {
      const dbTokens = await Promise.all(
        underlyingCoins.map((coin) =>
          this.saveTrackingAsset({
            assetAddress: coin,
            assetChain: assetChain,
          }),
        ),
      );

      await Promise.all(
        dbTokens.map((item, index) => {
          this.assetRepository.createRelation(assetToSave.id, item.id, index);
        }),
      );
      assetToSave.isLp = true;
    }

    assetToSave.isTracked = assetToSave.isLp !== true;
    assetToSave = await this.assetRepository.saveAsset(assetToSave);

    return this.withUnderlying(assetToSave);

    // const calls = new Map<string, CallData>();
    // for (let i = 0; i < 2; i++) {
    //   calls.set(String(i), {
    //     address: minter,
    //     abi: Abis.coins,
    //     input: {
    //       data: [i],
    //     },
    //     output: {},
    //   });
    // }
    //
    // const callsRsp = await this.multicallService.handleInBatches(calls, assetChain);
  }

  // async saveLikeCurveTrackingAsset({ assetAddress, assetChain }): Promise<any> {
  //   const existedAsset: AssetsEntity = await this.assetRepository.findOneByAddressAndChain(
  //     assetAddress,
  //     assetChain,
  //   );
  //
  //   if (existedAsset && (existedAsset.isTracked || existedAsset.isLp)) {
  //     return this.withUnderlying(existedAsset);
  //   }
  //
  //   const chainProvider = this.web3Provider.getInstanceByChainId(assetChain);
  //   // bind asset to LP token contract because it extends from ERC20 by default
  //   const assetContract = new LIKE_CURVE_LP(assetAddress, chainProvider);
  //   const assetData = await assetContract.getContractData();
  //
  //   let assetToSave: AssetsEntity;
  //   if (existedAsset) {
  //     assetToSave = existedAsset;
  //   } else {
  //     assetToSave = new AssetsEntity();
  //     assetToSave.chain = assetChain;
  //     assetToSave.address = assetAddress;
  //     assetToSave.icon = null;
  //     assetToSave.isLp = false;
  //     assetToSave.isAnalyticAvailable = false;
  //     assetToSave = await this.assetRepository.saveAsset(assetToSave);
  //   }
  //   assetToSave.name = assetData.name;
  //   assetToSave.symbol = assetData.symbol;
  //   assetToSave.decimals = assetData.decimals;
  //   // define is token LP
  //   try {
  //     const minter = await assetContract.minter();
  //
  //     const calls = new Map<string, CallData>();
  //     for (let i = 0; i < 3; i++) {
  //       calls.set(this.coinInfoLabel(i), {
  //         address: minter,
  //         abi: MINTER_ABI.find((data) => data['coins']),
  //         input: {
  //           data: [i],
  //         },
  //         output: {},
  //       });
  //     }
  //
  //     const callsRsp = await this.multicallService.handleInBatches(calls, ChainIdEnum.bsc);
  //     for (let i = 0; i < 3; i++) {
  //       const tokenAddress = callsRsp.get(this.coinInfoLabel(i)).output.data.lpToken;
  //     }
  //     // save underlying assets to database and start track them
  //     const [token0, token1] = await Promise.all([
  //       this.saveTrackingAsset({
  //         assetAddress: token0Address,
  //         assetChain: assetChain,
  //       }),
  //       this.saveTrackingAsset({
  //         assetAddress: token1Address,
  //         assetChain: assetChain,
  //       }),
  //     ]);
  //     // create relations between lp token and underlying tokens
  //     await Promise.all([
  //       this.assetRepository.createRelation(assetToSave.id, token0.id, 0),
  //       this.assetRepository.createRelation(assetToSave.id, token1.id, 1),
  //     ]);
  //     assetToSave.isLp = true;
  //     // eslint-disable-next-line no-empty
  //   } catch (e) {}
  //
  //   // we don't track lp tokens, we track underlying tokens only
  //   assetToSave.isTracked = assetToSave.isLp !== true;
  //   assetToSave = await this.assetRepository.saveAsset(assetToSave);
  //
  //   return this.withUnderlying(assetToSave);
  // }
  //
  // coinInfoLabel(index) {
  //   return concatStrings(Abis.poolInfo.name, index);
  // }

  async test({ assetAddress, assetChain }): Promise<AssetResponseDto> {
    const asset: AssetsEntity = await this.assetRepository.findOneByAddressAndChain(
      assetAddress,
      assetChain,
    );
    return this.withUnderlying(asset);
  }

  async withUnderlying(asset: AssetsEntity): Promise<AssetResponseDto> {
    if (asset.isLp === false) {
      return plainToClass(AssetResponseDto, asset, { excludeExtraneousValues: true });
    }

    const underlyingAssets: AssetsEntity[] = await this.assetRepository.findAllUnderlying(asset.id);
    const underlyingAssetsResponse: AssetResponseDto[] = [];
    // underlyingAssetsResponse.push(
    //   ...underlyingAssets.map((asset) =>
    //     plainToClass(AssetResponseDto, asset, { excludeExtraneousValues: true }),
    //   ),
    // );

    await Promise.all(
      underlyingAssets.map(async (asset) => {
        const underlyingResp = plainToClass(AssetResponseDto, asset, {
          excludeExtraneousValues: true,
        });
        if (asset.isLp) {
          const underlyingV2: AssetsEntity[] = await this.assetRepository.findAllUnderlying(
            asset.id,
          );
          underlyingResp.underlyingAssets = underlyingV2.map((underlying) =>
            plainToClass(AssetResponseDto, underlying, { excludeExtraneousValues: true }),
          );
        }
        underlyingAssetsResponse.push(underlyingResp);
      }),
    );

    const withUnderlying: AssetResponseDto = plainToClass(AssetResponseDto, asset, {
      excludeExtraneousValues: true,
    });
    withUnderlying.underlyingAssets = underlyingAssetsResponse;
    return withUnderlying;
  }
}
