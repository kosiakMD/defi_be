// eslint-disable-next-line max-classes-per-file
import { SearchResultType } from 'apps/gateway/src/search/interfaces/search.enum';
import {
  SearchParams,
  SearchResultsAssetEntry,
} from 'apps/gateway/src/search/interfaces/search.interface';
import { plainToClass } from 'class-transformer';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CurveAddresses } from '@app/common/constant/curve.addresses';
import { ChainIdEnum, ChainNameEnum, ResultStatus } from '@app/common/enum';
import { DetailedResponse, PoolAssetsQueryResp } from '@app/common/interfaces';
import { Address, Chains } from '@app/common/types';
import { AToken } from '@app/common/web3provider/contracts/protocols/aave/AToken';
import { VariableDebtToken } from '@app/common/web3provider/contracts/protocols/aave/VariableDebtToken';
import { CompoundToken } from '@app/common/web3provider/contracts/protocols/compound/CompoundToken';
import { TokenVault } from '@app/common/web3provider/contracts/protocols/yearn/TokenVault';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Web3Provider } from '../../common/providers/chainRelated/web3.provider';

import { CURVE_METAPOOL_ARBI_ABI } from '../approvals/abis/CURVE_METAPOOL_ARBI';
import { CURVE_REGISTRY_ABI } from '../approvals/abis/CURVE_REGISTRY';
import { CurveProviderAbi } from '../approvals/abis/CurveProviderAbi';
import { CURVE_LP } from '../approvals/contracts/CURVE_LP';
import { CURVE_REGISTRY } from '../approvals/contracts/CURVE_REGISTRY';
import { ELLIPSIS_LP } from '../approvals/contracts/ELLIPSIS_LP';
import { ERC20 } from '../approvals/contracts/ERC20';
import { MINTER } from '../approvals/contracts/MINTER';
import { UNIV2LP } from '../approvals/contracts/UNIV2LP';
import { ChainsService } from '../chains/chains.service';
import { MinimalStakedTokenCheck } from './contracts/MinimalStakedTokenCheck';
import { AssetDto, AssetResponseDto, AssetTrackDto, AssetWithUnderlying } from './dto/asset.dto';
import { AssetsPoolsDto, AssetsPoolsPostResponseDto } from './dto/assets.pools.dto';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsRepository } from './repositories/assets.repository';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(AssetsRepository) private readonly assetRepository: AssetsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly web3Provider: Web3Provider,
    private readonly multicall: MulticallAggregator,
    private readonly chainsService: ChainsService,
  ) {}
  async queryAllAssets(): Promise<AssetDto[]> {
    const storedAssets: AssetsEntity[] = await this.assetRepository.findAll();
    return storedAssets.map((asset) =>
      plainToClass(AssetDto, asset, { excludeExtraneousValues: true }),
    );
  }

  async findByAddressAndChain(address: Address, chainId: number): Promise<AssetsEntity> {
    return await this.assetRepository.findOneByAddressAndChain(address, chainId);
  }

  // TODO: Review this method
  async getAssetAndPoolObjects(chainId: number): Promise<AssetsPoolsDto[]> {
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

      let assets = await this.assetRepository.findAllByAddressesAndChains(
        // Only lowercase all EVM addresses
        // TODO: Checksum/Validation
        addresses.map((a) => (a.toLowerCase().startsWith('0x') ? a.toLowerCase() : a)),
        chains,
      );
      const isMissedAssetsExists = await this.addMissedAssets(assets, addresses, chains);
      if (isMissedAssetsExists) {
        assets = await this.assetRepository.findAllByAddressesAndChains(
          addresses.map((a) => (a.toLowerCase().startsWith('0x') ? a.toLowerCase() : a)),
          chains,
        );
      }

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

  async getAssetData(assetChain: number, assetAddress: string) {
    const chainProvider = await this.web3Provider.getInstanceByChainId(assetChain);
    const terraChainId = await this.chainsService.getChainIdByName(ChainNameEnum.terra);
    if (assetChain === terraChainId) {
      // eslint-disable-next-line camelcase
      return await chainProvider.wasm.contractQuery(assetAddress, { token_info: {} });
    } else if (assetChain === ChainIdEnum.kava) {
      return {
        name: assetAddress,
        symbol: assetAddress,
        decimals: 6,
      };
    } else {
      // bind asset to LP token contract because it extends from ERC20 by default
      const assetContract = new ERC20(assetAddress, chainProvider);
      return await assetContract.getContractData();
    }
  }

  private async addMissedAssets(assets: AssetsEntity[], addresses: Address[], chains: Chains) {
    const missedAssets = [];
    addresses.forEach((a) => {
      chains.forEach((c) => {
        const isExists = assets.find(
          (ae) =>
            ae.chain === c &&
            ae.address === (a.toLowerCase().startsWith('0x') ? a.toLowerCase() : a),
        );
        if (!isExists) {
          missedAssets.push([a.toLowerCase().startsWith('0x') ? a.toLowerCase() : a, c]);
        }
      });
    });

    let isFoundMissedAsset = false;
    for (let i = 0; i < missedAssets.length; i++) {
      try {
        await this.saveTrackingAsset({
          address: missedAssets[i][0],
          chain: missedAssets[i][1],
        });
        isFoundMissedAsset = true;
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }
    return isFoundMissedAsset;
  }

  async saveTrackingAsset({
    address: assetAddress,
    chain: assetChain,
    force,
  }: AssetTrackDto): Promise<AssetResponseDto> {
    const existedAsset: AssetsEntity = await this.assetRepository.findOneByAddressAndChain(
      assetAddress,
      assetChain,
    );

    if (existedAsset && !force) {
      return this.withUnderlying(existedAsset);
    }

    const assetData = await this.getAssetData(assetChain, assetAddress);

    let assetToSave: AssetsEntity;
    if (existedAsset) {
      assetToSave = existedAsset;
    } else {
      assetToSave = new AssetsEntity();
      assetToSave.chain = assetChain;
      assetToSave.address = assetAddress.toLowerCase(); // TODO: This creates invalid Solana addresses
      assetToSave.icon = null;
      assetToSave.isLp = false; // false for now, then save so that later in assetHasUnderlying we can create the relationships if needed
      assetToSave.isAnalyticAvailable = false;
      assetToSave = await this.assetRepository.saveAsset(assetToSave);
    }

    if (assetData) {
      assetToSave.name = assetData.name;
      assetToSave.symbol = assetData.symbol;
      assetToSave.decimals = assetData.decimals;
    }

    // Needs asset to exist in the database, as
    assetToSave.isLp = await this.assetHasUnderlying(assetToSave);

    // we don't track lp tokens, we track underlying tokens only
    assetToSave.isTracked = assetToSave.isLp !== true;

    assetToSave = await this.assetRepository.saveAsset(assetToSave);

    return await this.withUnderlying(assetToSave);
  }

  async saveAssetWithUnderlying(asset: AssetWithUnderlying): Promise<AssetResponseDto> {
    const existedAsset: AssetsEntity = await this.assetRepository.findOneByAddressAndChain(
      asset.address,
      asset.chain,
    );
    if (!existedAsset) throw new Error("Asset doesn't exists with address" + asset.address);

    await Promise.all(
      asset.pairs.map((address, idx) => this.saveAndRelate(existedAsset, address, idx)),
    );

    return this.withUnderlying(existedAsset);
  }

  async attemptTerraLp(asset: AssetsEntity) {
    try {
      const chainProvider = await this.web3Provider.getInstanceByChainId(asset.chain);
      const { minter } = await chainProvider.wasm.contractQuery(asset.address, { minter: {} });
      const underlyingInfo: PoolAssetsQueryResp = await chainProvider.wasm.contractQuery(minter, {
        pool: {},
      });
      const coins = underlyingInfo.assets.map((asset) =>
        asset.info.token ? asset.info.token.contract_addr : asset.info.native_token.denom,
      );

      await Promise.all(
        coins.map((address, idx) => {
          return this.saveAndRelate(asset, address, idx);
        }),
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async assetHasUnderlying(asset: AssetsEntity) {
    const results = await Promise.allSettled([
      this.attemptUniswapLikePair(asset),
      this.attemptCurveLikePool(asset),
      this.attemptEllipsisLikePair(asset),
      this.attemptAaveUnderlying(asset),
      this.attemptCompoundUnderlying(asset),
      this.attemptYearnUnderlying(asset),
      this.attempStakedToken(asset), // xSushi xBoo, ohm forks, memo, wmemo,
      this.attemptTerraLp(asset),
    ]);

    return results.some((result) => result.status === 'fulfilled' && Boolean(result.value));
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

  private async attempStakedToken(asset: AssetsEntity) {
    const contract = new MinimalStakedTokenCheck(asset.address);
    const checks = Object.keys(MinimalStakedTokenCheck);
    for (const check of checks) {
      try {
        const tokenAddress = await this.multicall.call(contract[check](), asset.chain);
        await this.saveAndRelate(asset, tokenAddress);
        return true;
      } catch (e) {
        //
      }
    }
  }

  private async attemptYearnUnderlying(asset: AssetsEntity) {
    const contract = new TokenVault(asset.address);
    const tokenAddress = await this.multicall.call(contract.token(), asset.chain);
    await this.saveAndRelate(asset, tokenAddress);
    return true;
  }

  private async attemptAaveUnderlying(asset: AssetsEntity) {
    try {
      const contract = new VariableDebtToken(asset.address);
      const tokenAddress = await this.multicall.call(
        contract.UNDERLYING_ASSET_ADDRESS(),
        asset.chain,
      );
      await this.saveAndRelate(asset, tokenAddress);
      return true;
    } catch {
      //
    }

    try {
      const contract = new AToken(asset.address);
      const tokenAddress = await this.multicall.call(
        contract.underlyingAssetAddress(),
        asset.chain,
      );
      await this.saveAndRelate(
        asset,
        tokenAddress
          .toLowerCase()
          .replace(/^0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee$/, ZERO_ADDRESS),
      );
      return true;
    } catch {
      //
    }
  }

  private async attemptCompoundUnderlying(asset: AssetsEntity) {
    const contract = new CompoundToken(asset.address);
    const tokenAddress = await this.multicall.call(contract.underlying(), asset.chain);
    await this.saveAndRelate(asset, tokenAddress);
    return true;
  }

  /**
   * Saves a new address as an underlying asset for a given token
   *
   * @param asset Existing database asset
   * @param underlyingAsset address of underlying token (pool token, etc)
   * @param [poolId=0]  positionInPool. (token0, token1)
   * @returns Promise<void>
   */
  private async saveAndRelate(asset: AssetsEntity, underlyingAsset: Address, poolId = 0) {
    const underlyingAddress = underlyingAsset.startsWith('0x')
      ? underlyingAsset.toLowerCase()
      : underlyingAsset;
    const underlying = await this.saveTrackingAsset({
      address: underlyingAddress,
      chain: asset.chain,
    });

    return await this.assetRepository.createRelation(asset.id, underlying.id, poolId);
  }

  private async attemptUniswapLikePair(asset: AssetsEntity) {
    const assetContract = new UNIV2LP(
      asset.address,
      await this.web3Provider.getInstanceByChainId(asset.chain),
    );

    // Call the uniswap specific functions. If its not a uniswap-pair contract
    // this will throw an error (and return false)
    const [token0Address, token1Address] = await Promise.all([
      assetContract.token0(),
      assetContract.token1(),
      assetContract.getReserves(),
    ]);

    await Promise.all(
      [token0Address, token1Address].map((address, idx) => this.saveAndRelate(asset, address, idx)),
    );

    return true;
  }

  private async attemptEllipsisLikePair(asset: AssetsEntity) {
    const chainProvider = await this.web3Provider.getInstanceByChainId(asset.chain);
    const assetContract = new ELLIPSIS_LP(asset.address, chainProvider);
    const minterAddress = await assetContract.minter();
    const minterContract = new MINTER(minterAddress, chainProvider, this.logger);

    const underlyingCoins = await minterContract.getCoinsArray();

    if (!underlyingCoins.length) {
      return false;
    }

    await Promise.all(underlyingCoins.map((coin, idx) => this.saveAndRelate(asset, coin, idx)));

    return true;
  }

  private async attemptCurveLikePool(asset: AssetsEntity) {
    // Call the curve specific functions. If its not a curve pool contract
    // this will throw an error (and return false)
    const coins = await this.findCurvePoolCoins(asset);
    if (!coins.length) {
      return false;
    }

    await Promise.all(
      coins.map((address, idx) => {
        return this.saveAndRelate(asset, address, idx);
      }),
    );
    return true;
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
    assetToSave.isTracked = !asset.isLp;
    assetToSave.extensions = asset.extensions;
    return await this.assetRepository.saveAsset(assetToSave);
  }

  async findCurvePoolCoins(asset: AssetsEntity): Promise<string[]> {
    const chainIds = await this.chainsService.getManyChainIdsByNames([
      ChainNameEnum.arbi,
      ChainNameEnum.eth,
    ]);

    if (chainIds.includes(asset.chain)) {
      const registries = await this.getCurveRegistries(asset.chain);
      const registriesResp = await Promise.all(
        registries.map(async (address) => {
          let contract = new CURVE_REGISTRY(
            address,
            await this.web3Provider.getInstanceByChainId(asset.chain),
            CURVE_REGISTRY_ABI,
          );

          let pool;
          try {
            pool = await contract.getPoolFromLpToken(asset.address);
            if (pool === ZERO_ADDRESS) return;
          } catch (e) {
            contract = new CURVE_REGISTRY(
              address,
              await this.web3Provider.getInstanceByChainId(asset.chain),
              CURVE_METAPOOL_ARBI_ABI,
            );
          }
          try {
            return await contract.getCoinsForLpToken(pool ?? asset.address);
          } catch (e) {
            //
          }
        }),
      );

      const lpCoins = registriesResp?.find((resp) => resp);
      if (lpCoins?.length) {
        return lpCoins;
      }
    }

    let curveLpPool = new CURVE_LP(
      asset.address,
      this.logger,
      await this.web3Provider.getInstanceByChainId(asset.chain),
    );

    let minter;
    try {
      minter = await curveLpPool.getMinter();
    } catch (e) {
      //
    }

    if (minter && minter !== ZERO_ADDRESS) {
      curveLpPool = new CURVE_LP(
        minter,
        this.logger,
        await this.web3Provider.getInstanceByChainId(asset.chain),
      );
    }
    return await curveLpPool.getCoinsForLpToken();
  }

  async getCurveRegistries(chain: number) {
    const curveProvider = new CurveProviderAbi(CurveAddresses.addressProvider);
    const resp = await this.multicall.handleInBatches(
      [0, 3, 5].reduce((resp, value) => {
        resp.set(value, curveProvider.getIdInfo(value));
        return resp;
      }, new Map()),
      chain,
    );
    return Array.from(resp.values()).map((value) => value.output.data.addr);
  }

  async search(searchParams: SearchParams): Promise<SearchResultsAssetEntry[]> {
    const assets = await this.assetRepository.findAssetsByParams(searchParams);
    return assets.map((a) => ({
      type: SearchResultType.ASSET,
      icon: a.icon,
      name: a.name,
      metadata: {
        address: a.address,
        chainId: a.chain,
        symbol: a.symbol,
      },
    }));
  }
}
