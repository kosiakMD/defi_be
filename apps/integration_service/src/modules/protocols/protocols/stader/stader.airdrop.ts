import { LCDClient } from '@terra-money/terra.js';
import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import { Address, ChainDto, FeatureEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common';
import { AirdropPositionDto, BaseDataAirdrop } from '@app/common/dto/baseDataAirdrop';
import { IntegrationERC20TokenDto } from '@app/common/jobs/staking';
import { Web3ProviderService } from '@app/common/web3provider';

import { toDecimals } from '../../../../common/utils/util';

import { AccountService } from '../../../microservices/account.service';
import { StaderAddresses } from './stader.addresses';

@Injectable()
export class StaderAirdrop {
  constructor(
    private readonly web3Service: Web3ProviderService,
    private readonly accountService: AccountService,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto) {
    const provider: LCDClient = this.web3Service.getInstanceByChainId(chain.id);
    const lunaToken = await this.accountService.getTrackedAssets(StaderAddresses.luna, chain.id);
    const baseDataRewardsMap: Map<string, BaseDataAirdrop> = new Map(
      addresses.map((a) => [a, this.getAirdropBaseData(a, chain)]),
    );

    const resultItems = [];
    await Promise.all(
      addresses.map(async (address) => {
        const potitions = baseDataRewardsMap.get(address);
        const {
          // eslint-disable-next-line camelcase
          user: { user_strategy_info },
        } = await provider.wasm.contractQuery(StaderAddresses.staderAirdropWithdraw, {
          // eslint-disable-next-line camelcase
          get_user: {
            user: address,
          },
        });

        // eslint-disable-next-line camelcase
        user_strategy_info?.forEach((strategy) => {
          const strategyName = (
            strategy.strategy_name.charAt(0).toUpperCase() + strategy.strategy_name.slice(1)
          )
            .split('_')
            .join(' ');
          resultItems.push(
            plainToClass(AirdropPositionDto, {
              name: strategyName,
              id: strategy.strategy_id,
              token: plainToClass(IntegrationERC20TokenDto, {
                address: lunaToken.address,
                name: lunaToken.name,
                symbol: lunaToken.symbol,
                decimals: lunaToken.decimals,
                balance: toDecimals(strategy.total_rewards, lunaToken.decimals),
              }),
              rewards: [],
            }),
          );
        });
        potitions.items = resultItems;
      }),
    );
    return Array.from(baseDataRewardsMap.values());
  }

  getAirdropBaseData(address: string, chain: ChainDto) {
    return plainToClass(BaseDataAirdrop, {
      chain: chain,
      userAddress: address,
      protocolType: ProtocolTypeEnum.airdrop,
      projectName: ProjectEnum.stader,
      feature: FeatureEnum.airdrop,
      items: [],
    });
  }
}
