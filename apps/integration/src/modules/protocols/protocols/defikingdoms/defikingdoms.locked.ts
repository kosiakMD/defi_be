import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  Address,
  ChainDto,
  FeatureEnum,
  ICallData,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BalanceData, BaseDataLocked, LockedToken } from '@app/common/dto/base.data.locked.dto';
import { concatStrings } from '@app/common/utils';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import { toDecimals } from '../../../../common/utils/util';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { AccountService } from '../../../microservices/account.service';
import { JewelAbis } from './contracts/jewel.abis';

@Injectable()
export class DefiKingdomsLocked {
  static jewelAddress = {
    harmony: '0x72cb10c6bfa5624dd07ef608027e366bd690048f',
  };

  constructor(
    private readonly accountService: AccountService,
    private readonly multicallProvider: MulticallProvider,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const multicallService: MulticallService = this.multicallProvider.getForChain(chain.abbr);
    const baseData: BaseDataLocked[] = [];
    await Promise.all(
      addresses.map(async (a) => {
        const baseInfo: BaseDataLocked = plainToClass(BaseDataLocked, {
          chain,
          projectName: ProjectEnum.defikingdoms,
          protocolName: ProtocolNameEnum.defikingdoms,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          feature: FeatureEnum.lockedBalances,
          items: [],
        });

        const lockedToken = await this.getLockedTokenBalances(a, multicallService, chain);
        lockedToken && baseInfo.items.push(lockedToken);
        baseData.push(baseInfo);
      }),
    );

    return baseData;
  }

  private async getLockedTokenBalances(
    userAddress: string,
    multicallService: MulticallService,
    chain: ChainDto,
  ) {
    const jewelToken = await this.accountService.getTrackedAssets(
      DefiKingdomsLocked.jewelAddress[chain.name],
      chain.id,
    );

    const contract = new JewelAbis(DefiKingdomsLocked.jewelAddress[chain.name]);
    const calls = new Map<string, ICallData>([
      [this.lockedBalanceLabel(userAddress), contract.lockOf(userAddress)],
      [this.unlockedBalanceLabel(userAddress), contract.balanceOf(userAddress)],
    ]);

    const userBalances: Map<string, ICallData> = await multicallService.handleInBatches(calls);

    const lockedBalance = toDecimals(
      userBalances.get(this.lockedBalanceLabel(userAddress))?.output.data,
      jewelToken.decimals,
    );
    const unlockedBalance = toDecimals(
      userBalances.get(this.unlockedBalanceLabel(userAddress))?.output.data,
      jewelToken.decimals,
    );

    if (lockedBalance === 0 && unlockedBalance === 0) return;

    const lockedToken = plainToClass(LockedToken, {
      address: jewelToken.address,
      name: jewelToken.name,
      symbol: jewelToken.symbol,
      decimals: jewelToken.decimals,
      locked: plainToClass(BalanceData, { balance: lockedBalance }),
      unlocked: plainToClass(BalanceData, { balance: unlockedBalance }),
    });

    lockedToken.totalBalance = lockedToken.locked.balance + lockedToken.unlocked.balance;

    return lockedToken;
  }

  private lockedBalanceLabel(userAddress: string) {
    return concatStrings(JewelAbis.lockOf.name, userAddress);
  }

  private unlockedBalanceLabel(userAddress: string) {
    return concatStrings(JewelAbis.balanceOf.name, userAddress);
  }
}
