import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import {
  Address,
  ChainDto,
  FeatureEnum,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { IntegrationClaimableTokenDto } from '@app/common';
import {
  CVX_ADDRESS,
  VOTE_LOCKED_CONVEX_TOKEN,
} from '@app/common/constant/protocols/convex.constants';
import { CallData } from '@app/common/dto/CallData';
import { BaseDataClaimable } from '@app/common/dto/base.data.claimable.dto';
import { BaseDataLocked, LockedToken } from '@app/common/dto/base.data.locked.dto';
import { ClaimableDto } from '@app/common/jobs/staking';
import { normalizeDecimals } from '@app/common/utils';
import { VoteLockedConvexToken } from '@app/common/web3provider/contracts/protocols/convex/VoteLockedConvexToken';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { IStakingFetcher } from './convex.interfaces';

@Injectable()
export class ConvexCvxLockedStaking implements IStakingFetcher {
  constructor(
    private readonly multicallService: MulticallAggregator,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
    private readonly priceService: PriceService,
  ) {}

  public async getData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<(BaseDataClaimable | BaseDataLocked)[]> {
    // get CVX token
    const contract = new VoteLockedConvexToken(VOTE_LOCKED_CONVEX_TOKEN);

    const calls = new Map(
      addresses.flatMap((address) => [
        [`lockedBalances(${address})`, contract.lockedBalances(address)],
        [`claimableRewards(${address})`, contract.claimableRewards(address)],
      ]),
    );

    const results = await this.multicallService.handleInBatches(calls, chain.id);

    const [tokens, prices] = await this.getTokensFromResults(addresses, results, chain);

    const baseData: (BaseDataClaimable | BaseDataLocked)[] = [];

    addresses.forEach((address) => {
      const lockInfo = this.getLockedBalances(address, chain, results, tokens, prices);
      baseData.push(lockInfo);

      const claimInfo = this.getClaimableBalances(address, chain, results, tokens, prices);
      baseData.push(claimInfo);
    });

    return baseData;
  }

  private getClaimableBalances(
    address: Address,
    chain: ChainDto,
    results: Map<string, CallData>,
    tokens: Map<Address, Asset>,
    prices: Map<Address, number>,
  ) {
    const baseInfo: BaseDataClaimable = plainToClass(BaseDataClaimable, {
      chain,
      projectName: ProjectEnum.convex,
      protocolName: ProtocolNameEnum.Convex,
      userAddress: address,
      protocolType: ProtocolTypeEnum.staking,
      feature: FeatureEnum.claimable,
      items: [],
    });
    const rawBalance = results.get(`claimableRewards(${address})`).output.data;

    rawBalance.forEach(({ token, amount }) => {
      const reward = tokens.get(token.toLowerCase());
      const price = prices.get(reward.address);
      const balance = normalizeDecimals(amount.toString(), reward.decimals);
      if (balance) {
        baseInfo.items.push(
          plainToClass(IntegrationClaimableTokenDto, {
            address: reward.address,
            name: reward.name,
            symbol: reward.symbol,
            decimals: reward.decimals,
            price,
            claimableData: plainToClass(ClaimableDto, {
              balance,
              value: balance * price,
            }),
          }),
        );
      }
    });

    return baseInfo;
  }
  private getLockedBalances(
    address: Address,
    chain: ChainDto,
    results: Map<string, CallData>,
    tokens: Map<Address, Asset>,
    prices: Map<Address, number>,
  ) {
    const baseInfo: BaseDataLocked = plainToClass(BaseDataLocked, {
      chain,
      projectName: ProjectEnum.convex,
      protocolName: ProtocolNameEnum.Convex,
      userAddress: address,
      protocolType: ProtocolTypeEnum.staking,
      feature: FeatureEnum.lockedBalances,
      items: [],
    });
    const rawBalance = results.get(`lockedBalances(${address})`).output.data;

    const balance = {
      total: normalizeDecimals(rawBalance.total.toString(), 18),
      unlockable: normalizeDecimals(rawBalance.unlockable.toString(), 18),
      locked: normalizeDecimals(rawBalance.locked.toString(), 18),
      lockData: rawBalance.lockData.map(({ amount, boosted, unlockTime }) => ({
        amount,
        boosted,
        unlockTime,
      })),
    };

    balance.lockData.forEach((lock) => {
      const cvx = tokens.get(CVX_ADDRESS);
      const price = prices.get(cvx.address);
      const balance = normalizeDecimals(lock.amount, cvx.decimals);
      if (balance) {
        baseInfo.items.push(
          plainToClass(LockedToken, {
            address: cvx.address,
            name: cvx.name,
            symbol: cvx.symbol,
            decimals: cvx.decimals,
            //
            price: prices.get(cvx.address),
            locked: { balance, value: balance * price },
            unlocked: { balance: 0, value: 0 },
            totalBalance: balance,
            totalValue: balance * price,
          }),
        );
      }
    });

    return baseInfo;
  }

  private async getTokensFromResults(
    addresses: Address[],
    results: Map<string, CallData>,
    chain: ChainDto,
  ): Promise<[Map<Address, Asset>, Map<Address, number>]> {
    // Get tokens from results
    const tokenAddresses = new Set([CVX_ADDRESS]);
    addresses.forEach((address) => {
      results.get(`claimableRewards(${address})`).output.data.forEach(({ token }) => {
        tokenAddresses.add(token.toLowerCase());
      });
    });

    const [tokens, { prices }] = await Promise.all([
      this.accountService.getAssets(Array.from(tokenAddresses), [chain.id]),
      this.priceService.getTokenPricesFetch(Array.from(tokenAddresses), chain.id),
    ]);

    return [
      new Map(tokens.data.map((token): [Address, Asset] => [token.address, token])),
      new Map(tokens.data.map((token) => [token.address, Number(prices[token.address])])),
    ];
  }
}
