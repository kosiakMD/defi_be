import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { CurrentPricesPayload } from '../../../../../common/dto';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { updateSynapseLpTokens } from '../Liquidity/SynapseLiquidity';
import { MasterChef } from './MasterChef';

export class SynapseStaking extends MasterChef {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
  ) {
    super(abiService, multicall, logger, cache, accountService, priceService);
  }

  functionPredicates: INamedFunctionPredicates = {
    lpToken: () => (item) => item.name === 'lpToken',
    poolInfo: () => (item) => item.name === 'poolInfo',
    pendingRewards: () => (item) => item.name === 'pendingSynapse',
    poolLength: () => (item) => item.name === 'poolLength',
    rewardPerSecond: () => (item) => item.name === 'synapsePerSecond',
    userInfo: () => (item) => item.name === 'userInfo',
    totalAllocPoint: () => (item) => item.name === 'totalAllocPoint',
  };

  protected async fetchPoolInfos(poolIds: number[]): Promise<any[]> {
    const contract = this.getMainContract();

    const lpTokensCalls = [];
    const poolInfoCalls = poolIds.map((poolId) => {
      lpTokensCalls.push(contract.createCall(this.functions.lpToken, poolId));
      return contract.createCall(this.functions.poolInfo, poolId);
    });

    const [poolInfo, lpTokens] = await Promise.all([
      this.multicall.callArray(poolInfoCalls, this.meta.chain),
      this.multicall.callArray(lpTokensCalls, this.meta.chain),
    ]);

    return this.formatPoolInfo(
      poolInfo.map((poolInfo, idx) => {
        poolInfo.poolId = poolIds[idx];
        poolInfo.stakedToken = lpTokens[idx].toLowerCase();
        return poolInfo;
      }),
    );
  }

  protected async updateTokenData(
    tokens: any[],
    prices: CurrentPricesPayload,
  ): Promise<ERC20Token[]> {
    try {
      return await updateSynapseLpTokens(
        tokens,
        prices,
        this.multicall,
        this.logger,
        this.abiService,
        this.meta.chain,
      );
    } catch (err) {
      this.logger.error(err.message, err.stack, 'SynapseStaking');
      return tokens;
    }
  }
}
