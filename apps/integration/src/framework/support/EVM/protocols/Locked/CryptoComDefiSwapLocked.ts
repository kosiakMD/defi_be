import { UniswapV2AssetService } from 'apps/integration/src/modules/microservices/uniswap.asset.service';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

// import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { RootLocked } from './RootLocked';

export class CryptoComDefiSwapLocked extends RootLocked {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: UniswapV2AssetService,
  ) {
    super(abiService, multicall, logger, cache, assetService);
  }

  // protected functionPredicates: INamedFunctionPredicates = {
  //   tokenLocked: () => (item) => item.name === 'token',
  //   totalSupply: () => (item) => item.name === 'totalStaked',
  //   getPersonalStakes: () => (item) => item.name === 'getPersonalStakes',
  // };

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const { 0: unlockTime, 1: balance } = await this.getUsersBalance(
      address,
      pools[0].supplied[0].token.address,
    );

    const poolsList = unlockTime.map((l, idx) => ({
      ...pools[0],
      balance: balance[idx],
      unlockTime: l,
    }));

    return poolsList
      .map((p) => {
        return this.formatUserData(p);
      })
      .filter((ub) => !!ub);
  }

  async getUsersBalance(address: string, tokenAddress: string) {
    const contract = this.getMainContract();
    const calls = new Map([
      [`${address} ${tokenAddress}`, contract.createCall(this.functions.lockedInfo, address)],
    ]);
    const multiCallsUserBalances = await this.multicall.handleInBatches(calls, this.meta.chain);
    return multiCallsUserBalances.get(`${address} ${tokenAddress}`).output.data;
  }

  protected formatUserData(pool: IStakingFeatureOpportunity): IStakingFeatureUserEntry {
    const usersPool = cloneDeep(pool);
    const lpToken = usersPool.supplied[0];

    const balanceNormalized = normalizeDecimals(
      usersPool['balance'].toString(),
      lpToken.token.decimals,
    );
    Object.assign(usersPool.supplied[0], {
      amount: balanceNormalized,
      value: balanceNormalized * lpToken.token.price,
      unlockTime: usersPool['unlockTime'] * 1000, //ms
    });

    return usersPool as IStakingFeatureUserEntry;
  }
}
