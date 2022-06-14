import { UniswapV2AssetService } from 'apps/integration/src/modules/microservices/uniswap.asset.service';
import { Cache } from 'cache-manager';
import { filter, firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { FeatureEnum } from '../../../enums';
import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export type IStakingFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal<{ apy: number }>,
  void,
  void,
  { pricePerFullShare: number }
>;

export type IStakingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  void,
  void,
  { pricePerFullShare: string }
>;
export type IStakingFeatureUserEntry = BaseWithTokens<ISupplyTokenUserEntry, void, void, void>;

export interface IBeefyVaultMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.staking;
  name: string;
  links?: {
    getOpportunityLink: () => string;
  };
  context: {
    chainEndpoint: string;
    vaultEndpoint: string;
    apyEndpoint: string;
  };
}

export class BeefyVault
  extends SingleContractProtocol<
    IStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    IBeefyVaultMeta
  >
  implements IRootProtocol
{
  protected functionPredicates: INamedFunctionPredicates = {
    decimals: () => (item) => item.name === 'decimals',
    balanceOf: () => (item) => item.name === 'balanceOf',
    totalSupply: () => (item) => item.name === 'totalSupply',
    pricePerFullShare: () => (item) => item.name === 'getPricePerFullShare',
  };

  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: UniswapV2AssetService,
    protected httpService: HttpService,
  ) {
    super();
  }

  protected async fetchOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    const $vaults = this.httpService.get<any>(this.meta.context.vaultEndpoint).pipe(
      mergeMap((response) => response.data),
      filter((vault: any) => vault.chain === this.meta.context.chainEndpoint),
      toArray(),
    );

    const $apy = this.httpService
      .get<Record<string, number>>(this.meta.context.vaultEndpoint)
      .pipe(map((response) => response.data));
    const [vaults, apy] = await Promise.all([firstValueFrom($vaults), firstValueFrom($apy)]);

    const totalStakedCalls = vaults.map((vault) => {
      const contract = new ERC20(vault.earnContractAddress);
      return contract.totalSupply();
    });

    const results = await this.multicall.callArray(totalStakedCalls, this.meta.chain);

    const result: IStakingFeatureMinimal[] = vaults.map((vault, index) => {
      const totalSupplied = results[index].toString();
      return {
        id: vault.earnContractAddress.toLowerCase(),
        chain: this.meta.chain,
        feature: this.meta.feature,
        supply: {
          token: {
            address: (vault.tokenAddress || ZERO_ADDRESS).toLowerCase(),
          },
          extra: {
            apy: Number(apy[vault.id]) || 0,
          },
          totalSupplied: totalSupplied,
        },
        meta: {
          pricePerFullShare: vault.pricePerFullShare,
        },
      };
    });
    return result;
  }

  protected formatOpportunitySuppliedToken(
    supply: ISupplyTokenMinimal<{ apy: number }>,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(supply.totalSupplied, token.decimals);
    return {
      token,
      apy: { year: supply.extra.apy },
      tvl: totalSupplied * token.price,
    };
  }

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const calls = new Map();

    pools.forEach((pool) => {
      const contract = new DynamicContract(pool.id);

      calls.set(
        this.balanceOf(pool.id, address),
        contract.createCall(this.functions.balanceOf, address),
      );
    });

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools.reduce((pools, pool) => {
      const userPool = this.formatUserData(address, pool, results);
      if (userPool) {
        pools.push(userPool);
      }

      return pools;
    }, []);
  }

  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const { meta, ...poolInfo } = pool;
    const balanceRaw = data.get(this.balanceOf(poolInfo.id, address)).output.data;
    const balance = normalizeDecimals(balanceRaw.toString(), poolInfo.supply.token.decimals);

    if (!balance) return;
    const pricePerFullShare = normalizeDecimals(
      meta.pricePerFullShare,
      poolInfo.token?.decimals || 18,
    );
    const balanceWithPricePerShare = meta.pricePerFullShare ? balance * pricePerFullShare : balance;

    const result: IStakingFeatureUserEntry = {
      ...poolInfo,
      supply: this.modifyUserEntrySupplied(
        poolInfo.supply,
        balanceWithPricePerShare,
        pricePerFullShare,
      ),
    };

    return result;
  }

  protected modifyUserEntrySupplied(
    supplied: ISupplyTokenOpportunity,
    balance: number,
    pricePerFullShare: number,
  ): ISupplyTokenUserEntry {
    const poolShare = balance / supplied.token.totalSupply;
    supplied.token.underlying?.forEach((underlying) => {
      underlying.balance = underlying.reserve * poolShare;
      underlying.value = underlying.balance * underlying.price;
    });

    return {
      ...supplied,
      amount: balance,
      value: balance * supplied.token.price,
      tvl: supplied.tvl * pricePerFullShare,
    };
  }

  protected totalSupply(address: Address) {
    return `${address}.totalSupply()`;
  }

  protected balanceOf(contract: Address, user: Address): string {
    return `${contract}.userInfo(${user})`;
  }
}
