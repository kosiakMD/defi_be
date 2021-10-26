import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  ProjectEnum,
  Logger,
  IntegrationFeaturesDataDto,
  ChainIdEnum,
  FeatureEnum,
  FeatureResultDto,
} from '@app/common';

import { AccountService } from '../../../account/account.service';
import {
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
} from '../../../integrations/integrations.dto';
import { PriceService } from '../../../price/price.service';
import { decimalsDivider } from '../../../utils/util';
import BasicProtocol from '../basicProtocol';
import { YearnV1Subgraph } from './services/yearn.v1.subgraph';
import { YearnV2Subgraph } from './services/yearn.v2.subgraph';
import { IVaultPosition, IVaultV1Position } from './yearn.interfaces';

@Injectable()
export abstract class YearnProtocolBase extends BasicProtocol {
  // Defaults
  readonly project = ProjectEnum.yearn;

  // Types
  readonly logged: Logger;
  protected readonly yearnSubgraph: YearnV1Subgraph | YearnV2Subgraph;
  protected readonly accountService: AccountService;
  protected readonly priceService: PriceService;

  async getAllFeaturesData(
    address: string,
    chainId: ChainIdEnum,
  ): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    await this.getStakingData(response, address, chainId);

    return response;
  }

  getPositionBalance(position: IVaultPosition) {
    if ((position as IVaultV1Position).shareBalance) {
      return new BigNumber(position.shareBalance).multipliedBy(position.vault.pricePerFullShare);
    }

    return new BigNumber(position.balance).div(decimalsDivider(position.token.decimals));
  }

  async getStakingData(
    response: IntegrationFeaturesDataDto,
    address: string,
    chainId: ChainIdEnum,
  ) {
    const users = await this.yearnSubgraph.getVaultPositions(
      address.toLowerCase().split(','),
      chainId,
    );

    const stakedTokenAddresses = users.flatMap((user) => {
      return user.positions.map((position) => position.token.address.toLowerCase());
    });

    const prices = await this.priceService.getTokenPricesFetch(stakedTokenAddresses, chainId);
    let totalValue = 0;

    const vaultPromises: IntegrationStakingPositionDto[] = users.flatMap((user) =>
      user.positions.flatMap((position): IntegrationStakingPositionDto => {
        const price = prices.prices[position.token.address];
        const balance = this.getPositionBalance(position);
        const value = balance.multipliedBy(price).toNumber();
        totalValue += value;

        return {
          address: position.vault.address,
          poolId: null,
          poolName: position.shareToken.symbol,
          staked: balance.multipliedBy(decimalsDivider(position.token.decimals)).toString(),
          stakingToken: plainToClass(IntegrationERC20TokenDto, {
            symbol: position.token.symbol,
            name: position.token.name,
            decimals: position.token.decimals,
            address: position.token.address,
            price,
            balance,
            value,
          }),
        };
      }),
    );

    const result: FeatureResultDto<IntegrationStakingPositionDto> = {
      totalValue: totalValue,
      items: vaultPromises,
    };

    response[FeatureEnum.staking] = result;
  }
}
