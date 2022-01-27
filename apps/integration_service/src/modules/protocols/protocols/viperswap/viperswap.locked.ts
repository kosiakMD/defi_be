import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  Address,
  ChainDto,
  FeatureEnum,
  ICallData,
  ProjectEnum,
  ProtocolTypeEnum,
  ChainAbbrEnum,
  ProtocolNameEnum,
} from '@app/common';
import { concatStrings } from '@app/common/utils';
import { toDecimals } from '../../../../common/utils/util';
import { BaseDataLocked, LockedToken, BalanceData } from '@app/common/dto/base.data.locked.dto';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import { AccountService } from '../../../microservices/account.service';
import { ViperAbis } from './contracts/viper.abis';

@Injectable()
export class ViperswapLocked {
  private readonly multicallService: MulticallService;

  static viperAddress = '0xea589e93ff18b1a1f1e9bac7ef3e86ab62addc79';

  constructor(
    private readonly accountService: AccountService,
    private readonly multicallProvider: MulticallProvider,
  ) {
    this.multicallService = multicallProvider.getForChain(ChainAbbrEnum.harm);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const baseData: BaseDataLocked[] = [];
    await Promise.all(addresses.map(async (a) => {
      const baseInfo: BaseDataLocked = plainToClass(BaseDataLocked, {
        chain,
        projectName: ProjectEnum.viperswap,
        protocolName: ProtocolNameEnum.viperswap,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.lockedBalances,
        items: [],
      });

      const lockedToken = await this.getLockedTokenBalances(a, chain);
      lockedToken && baseInfo.items.push(lockedToken);
      baseData.push(baseInfo);
    }));

    return baseData;
  }

  private async getLockedTokenBalances(userAddress: string, chain: ChainDto) {
    const viperToken = await this.accountService.getTrackedAssets(ViperswapLocked.viperAddress, chain.id);

    const contract = new ViperAbis(ViperswapLocked.viperAddress);
    const calls = new Map<string, ICallData>([
      [this.lockedBalanceLabel(userAddress), contract.lockOf(userAddress)],
      [this.unlockedBalanceLabel(userAddress), contract.balanceOf(userAddress)],
    ]);

    const userBalances: Map<string, ICallData> = await this.multicallService.handleInBatches(calls);

    const lockedBalance = toDecimals(userBalances.get(this.lockedBalanceLabel(userAddress))?.output.data, viperToken.decimals);
    const unlockedBalance = toDecimals(userBalances.get(this.unlockedBalanceLabel(userAddress))?.output.data, viperToken.decimals);

    if (lockedBalance === 0 && unlockedBalance === 0) return;

    const lockedToken = plainToClass(LockedToken, {
      address: viperToken.address,
      name: viperToken.name,
      symbol: viperToken.symbol,
      decimals: viperToken.decimals,
      locked: plainToClass(BalanceData, {balance: lockedBalance}),
      unlocked: plainToClass(BalanceData, {balance: unlockedBalance}),
    });

    lockedToken.totalBalance = lockedToken.locked.balance + lockedToken.unlocked.balance;

    return lockedToken;
  }

  private lockedBalanceLabel(userAddress: string) {
    return concatStrings(ViperAbis.lockOf.name, userAddress);
  }

  private unlockedBalanceLabel(userAddress: string) {
    return concatStrings(ViperAbis.balanceOf.name, userAddress);
  }
}
