import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { filter, firstValueFrom, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, CurrentPricesPayload, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CallData } from '@app/common/dto/CallData';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { UniswapV2Pair } from '@app/common/web3provider/contracts/UniswapV2Pair';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
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

type ExtraInformation = {
  pricePerFullShare: string;
};

export type IStakingFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  void,
  void,
  ExtraInformation
>;

export type IStakingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  void,
  void,
  ExtraInformation
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
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
  ) {
    super();
  }
  // TODO: USE Curve token once assets service;
  protected async fetchOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    const $data = this.httpService.get<any>(this.meta.context.vaultEndpoint).pipe(
      mergeMap((response) => response.data),
      filter(
        (vault: any) =>
          vault.chain === this.meta.context.chainEndpoint && vault.tokenDescription !== 'Curve',
      ),
      toArray(),
    );
    const vaults: any[] = await firstValueFrom($data);

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
          totalSupplied: totalSupplied,
        },
        meta: {
          pricePerFullShare: vault.pricePerFullShare,
        },
      };
    });

    return result;
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
    const balanceWithPricePerShare = meta.pricePerFullShare
      ? balance * normalizeDecimals(meta.pricePerFullShare, poolInfo.token.decimals)
      : balance;

    const result: IStakingFeatureUserEntry = {
      ...poolInfo,
      supply: this.modifyUserEntrySupplied(poolInfo.supply, balanceWithPricePerShare),
    };

    return result;
  }

  protected modifyUserEntrySupplied(supplied: ISupplyTokenOpportunity, balance: number) {
    const poolShare = balance / supplied.token.totalSupply;
    supplied.token.underlying?.forEach((underlying) => {
      underlying.balance = underlying.reserve * poolShare;
      underlying.value = underlying.balance * underlying.price;
    });

    return Object.assign(supplied, {
      amount: balance,
      value: balance * supplied.token.price,
    });
  }

  protected totalSupply(address: Address) {
    return `${address}.totalSupply()`;
  }

  protected balanceOf(contract: Address, user: Address): string {
    return `${contract}.userInfo(${user})`;
  }

  /**
   * TODO: remove it once assets service done
   */
  async updateUniswapLikeTokensData(tokens: any[], prices: CurrentPricesPayload) {
    const requests = [];
    for (const token of tokens) {
      const calls = new Map();
      if (token.underlyingAssets?.length !== 2) continue;
      const contract = new UniswapV2Pair(token.address);
      calls.set(`${token.address}.totalSupply()`, contract.totalSupply());
      calls.set(`${token.address}.getReserves()`, contract.getReserves());
      calls.set(`${token.address}.token0()`, contract.token0());
      calls.set(`${token.address}.token1()`, contract.token1());
      token.underlyingAssets.forEach((asset) => {
        const c = new ERC20(asset.address);
        calls.set(`${asset.address}.totalSupply()`, c.totalSupply());
      });
      requests.push(calls);
    }

    const responsesRaw = await Promise.allSettled(
      requests.flatMap((call) => this.multicall.handleInBatches(call, this.meta.chain)),
    );
    const [data, errors] = handlePromiseAllSettled(responsesRaw);

    const dataArray: any[] = data.flatMap((callData) => Array.from(callData.entries()));
    const results: Map<string, CallData> = new Map(dataArray);

    tokens.forEach((token: any) => {
      if (token.underlyingAssets?.length !== 2 || !results.has(`${token.address}.totalSupply()`))
        return;
      const totalSupply = results.get(`${token.address}.totalSupply()`).output.data;
      const token0Address = results.get(`${token.address}.token0()`).output.data.toLowerCase();
      const token1Address = results.get(`${token.address}.token1()`).output.data.toLowerCase();
      const { _reserve0, _reserve1 } = results.get(`${token.address}.getReserves()`).output.data;
      if (!Number(prices[token0Address]) && !Number(prices[token1Address])) return;

      const underlying0 = token.underlyingAssets.find((a) => a.address === token0Address);
      const underlying1 = token.underlyingAssets.find((a) => a.address === token1Address);

      const reserve0 = normalizeDecimals(_reserve0.toString(), underlying0.decimals);
      const reserve1 = normalizeDecimals(_reserve1.toString(), underlying1.decimals);

      // calculate/fill in missing base token prices based on current LP reserves
      if (!prices[token0Address]) {
        prices[token0Address] = (reserve1 * Number(prices[token1Address])) / reserve0;
      }

      if (!prices[token1Address]) {
        prices[token1Address] = (reserve0 * Number(prices[token0Address])) / reserve1;
      }

      // calculate/fill the LP token price into the price array
      const tvl0 = new BigNumber(reserve0 * Number(prices[token0Address]));
      const tvl1 = new BigNumber(reserve1 * Number(prices[token1Address]));

      token.totalSupply = normalizeDecimals(totalSupply, token.decimals);

      prices[token.address] = new BigNumber(tvl0.plus(tvl1)) //
        .div(token.totalSupply)
        .toNumber();

      token.underlyingAssets.forEach((u) => {
        u.totalSupply = normalizeDecimals(
          results.get(`${u.address}.totalSupply()`).output.data,
          u.decimals,
        );

        u.reserve = normalizeDecimals(
          (u.reserve = u.positionInPool === 0 ? _reserve0 : _reserve1).toString(),
          u.decimals,
        );
      });
    });
    return tokens;
  }

  protected async updateTokenData(
    tokens: any[],
    prices: CurrentPricesPayload,
  ): Promise<ERC20Token[]> {
    try {
      return await this.updateUniswapLikeTokensData(tokens, prices);
    } catch (err) {
      // TODO: delete this block, Prices should come from asset service, not calculated here
      this.logger.error(err.message, err.stack, 'EVMCore');
      return tokens;
    }
  }
}
