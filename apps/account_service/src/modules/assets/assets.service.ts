// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';

import { HttpStatus, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { CurveAddresses } from '@app/common/constant/addresses';
import { ChainIdEnum, ResultStatus } from '@app/common/enum';
import { DetailedResponse } from '@app/common/interfaces';
import { ellipsisPoolsMap } from '@app/common/jobs/ellipsis.pools.map';
import { Address, Chains } from '@app/common/types';

import { Web3Provider } from '../../common/providers/chainRelated/web3.provider';

import { CURVE_REGISTRY } from '../approvals/contracts/CURVE_REGISTRY';
import { ELLIPSIS_LP } from '../approvals/contracts/ELLIPSIS_LP';
import { ERC20 } from '../approvals/contracts/ERC20';
import { MINTER } from '../approvals/contracts/MINTER';
import { UNIV2LP } from '../approvals/contracts/UNIV2LP';
import { AssetDto, AssetResponseDto } from './dto/asset.dto';
import { AssetsPoolsDto, AssetsPoolsPostResponseDto } from './dto/assets.pools.dto';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsRepository } from './repositories/assets.repository';

export class AssetsService {
  constructor(
    @InjectRepository(AssetsRepository) private readonly assetRepository: AssetsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly web3Provider: Web3Provider,
  ) {}
  async queryAllAssets(): Promise<AssetDto[]> {
    const storedAssets: AssetsEntity[] = await this.assetRepository.findAll();
    return storedAssets.map((asset) =>
      plainToClass(AssetDto, asset, { excludeExtraneousValues: true }),
    );
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
      const assets = await this.assetRepository.findAllByAddressesAndChains(
        addresses.map((a) => a.toLowerCase()),
        chains,
      );

      this.logger.timeEnd(timeMark);
      response.data.push(
        ...(await Promise.all(
          assets.map(async (asset) => {
            return plainToClass(AssetResponseDto, await this.withUnderlying(asset), {
              excludeExtraneousValues: true,
            });
          }),
        )),
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

  async saveTrackingAsset({ assetAddress, assetChain }): Promise<AssetResponseDto> {
    const existedAsset: AssetsEntity = await this.assetRepository.findOneByAddressAndChain(
      assetAddress,
      assetChain,
    );

    // TODO: Curve uses actual ETH (not ERC20) with address 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
    // Should we show wrapped eth instead, or...
    // if (existedAsset && existedAsset.isLp) {
    //   return this.withUnderlying(existedAsset);
    // }
    if (existedAsset && (existedAsset.isTracked || existedAsset.isLp)) {
      return this.withUnderlying(existedAsset);
    }

    const chainProvider = this.web3Provider.getInstanceByChainId(assetChain);

    // bind asset to LP token contract because it extends from ERC20 by default
    const assetContract = new ERC20(assetAddress, chainProvider);

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

    assetToSave.isLp = await this.attemptUniswapLikePair(assetToSave);

    if (!assetToSave.isLp) {
      assetToSave.isLp = await this.attemptCurveLikePool(assetToSave);
    }

    if (ellipsisPoolsMap.get(assetAddress)) {
      assetToSave.isLp = await this.attemptEllipsisLikePair(assetToSave);
    }

    // we don't track lp tokens, we track underlying tokens only
    assetToSave.isTracked = assetToSave.isLp !== true;
    assetToSave = await this.assetRepository.saveAsset(assetToSave);

    return this.withUnderlying(assetToSave);
  }

  async withUnderlying(asset: AssetsEntity): Promise<AssetResponseDto> {
    if (asset.isLp === false) {
      return plainToClass(AssetResponseDto, asset, { excludeExtraneousValues: true });
    }

    const underlyingAssets = await this.assetRepository.findAllUnderlying(asset.id);
    const underlyingAssetsResponse: AssetResponseDto[] = [];
    underlyingAssetsResponse.push(
      ...(await Promise.all(
        underlyingAssets.map(async (asset) => {
          const filled = asset.isLp ? await this.withUnderlying(asset) : asset;
          return plainToClass(AssetResponseDto, filled, {
            excludeExtraneousValues: true,
          });
        }),
      )),
    );

    const withUnderlying: AssetResponseDto = plainToClass(AssetResponseDto, asset, {
      excludeExtraneousValues: true,
    });
    withUnderlying.underlyingAssets = underlyingAssetsResponse;
    return withUnderlying;
  }

  private async attemptUniswapLikePair(asset: AssetsEntity) {
    try {
      const assetContract = new UNIV2LP(
        asset.address,
        this.web3Provider.getInstanceByChainId(asset.chain),
      );

      // Call the uniswap specific functions. If its not a uniswap-pair contract
      // this will throw an error (and return false)
      const [token0Address, token1Address] = await Promise.all([
        assetContract.token0(),
        assetContract.token1(),
        assetContract.getReserves(),
      ]);

      // save underlying assets to database and start track them
      const [token0, token1] = await Promise.all([
        this.saveTrackingAsset({
          assetAddress: token0Address,
          assetChain: asset.chain,
        }),
        this.saveTrackingAsset({
          assetAddress: token1Address,
          assetChain: asset.chain,
        }),
      ]);

      // create relations between lp token and underlying tokens
      await Promise.all([
        this.assetRepository.createRelation(asset.id, token0.id, 0),
        this.assetRepository.createRelation(asset.id, token1.id, 1),
      ]);

      return true;
      // eslint-disable-next-line no-empty
    } catch {
      return false;
    }
  }

  async attemptEllipsisLikePair(asset: AssetsEntity) {
    try {
      const chainProvider = this.web3Provider.getInstanceByChainId(asset.chain);
      const assetContract = new ELLIPSIS_LP(asset.address, chainProvider);
      const minterAddress = await assetContract.minter();
      const minterContract = new MINTER(minterAddress, chainProvider);

      const underlyingCoins = [];
      const lpData = ellipsisPoolsMap.get(asset.address);
      for (let i = 0; i < lpData?.coins; i++) {
        const coin = await minterContract.coins(i);
        underlyingCoins.push(coin.toLowerCase());
      }

      if (underlyingCoins.length) {
        const dbTokens = await Promise.all(
          underlyingCoins.map((coin) =>
            this.saveTrackingAsset({
              assetAddress: coin,
              assetChain: asset.chain,
            }),
          ),
        );

        await Promise.all(
          dbTokens.map((item, index) => {
            this.assetRepository.createRelation(asset.id, item.id, index);
          }),
        );
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  private async attemptCurveLikePool(asset: AssetsEntity) {
    // TODO: Eth only for now
    if (asset.chain !== ChainIdEnum.eth) return false;

    try {
      const registry = new CURVE_REGISTRY(
        CurveAddresses.registry,
        this.web3Provider.getInstanceByChainId(asset.chain),
      );

      const coins = await registry.getCoinsForLpToken(asset.address);

      // Call the curve specific functions. If its not a curve pool contract
      // this will throw an error (and return false)
      const newAssets = await Promise.all(
        coins.map((address) => {
          return this.saveTrackingAsset({
            assetAddress: address,
            assetChain: asset.chain,
          });
        }),
      );

      // create relations between lp token and underlying tokens
      await Promise.all(
        newAssets.map((newAsset: any, idx: number) => {
          return this.assetRepository.createRelation(asset.id, newAsset.id, idx);
        }),
      );

      return true;
    } catch (e) {
      return false;
    }
  }

  async saveAsset(asset: AssetDto): Promise<AssetResponseDto> {
    const existedAsset: AssetsEntity = await this.assetRepository.findOneByAddressAndChain(
      asset.address,
      asset.chain,
    );

    if (existedAsset) {
      return existedAsset;
    }

    const assetToSave = new AssetsEntity();
    assetToSave.chain = asset.chain;
    assetToSave.address = asset.address;
    assetToSave.icon = null;
    assetToSave.isLp = asset.isLp;
    assetToSave.isAnalyticAvailable = false;
    assetToSave.name = asset.name;
    assetToSave.symbol = asset.symbol;
    assetToSave.decimals = asset.decimals;
    assetToSave.isTracked = asset.isLp !== true;
    return await this.assetRepository.saveAsset(assetToSave);
  }
}
