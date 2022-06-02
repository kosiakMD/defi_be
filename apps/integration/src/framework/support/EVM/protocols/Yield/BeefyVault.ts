import { Cache } from 'cache-manager';
import { filter, firstValueFrom, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FeatureEnum } from '../../../enums';
import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export type IStakingFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal[],
  void,
  void
>;

export type IStakingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity[],
  void,
  void
>;

export type IStakingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry[],
  void,
  any
>;

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
    balanceOf: () => (item) => item.name === 'balanceOf',
    totalSupply: () => (item) => item.name === 'totalSupply',
    getPricePerFullShare: () => (item) => item.name === 'getPricePerFullShare',
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
        id: `${vault.earnContractAddress.toLowerCase()}`,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supply: {
          token: {
            address: (vault.tokenAddress || ZERO_ADDRESS).toLowerCase(),
          },
          totalSupplied: totalSupplied,
        },
        rewarded: [],
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
    const balanceRaw = data.get(this.balanceOf(pool.id, address)).output.data;
    const balance = normalizeDecimals(balanceRaw.toString(), pool.supply.token.decimals);

    if (!balance) return;
    pool.supply = this.modifyUserEntrySupplied(pool.supply, balance);
    return pool as IStakingFeatureUserEntry;
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
    return `${address}.totalSupply`;
  }

  protected balanceOf(contract: Address, user: Address): string {
    return `${contract}.userInfo, ${user})`;
  }
}
