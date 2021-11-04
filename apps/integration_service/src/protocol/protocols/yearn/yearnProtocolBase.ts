import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  ProjectEnum,
  Logger,
  IntegrationFeaturesDataDto,
  FeatureEnum,
  FeatureResultDto,
  ChainDto,
} from '@app/common';

import { AccountService } from '../../../account/account.service';
import { Web3Provider } from '../../../chain/web3.provider';
import {
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
} from '../../../integrations/integrations.dto';
import { PriceService } from '../../../price/price.service';
import { decimalsDivider } from '../../../utils/util';
import BasicProtocol from '../basicProtocol';
import { LocalMultiCall } from './multicall/local.multi.call';
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
  protected readonly web3Provider: Web3Provider;

  async getAllFeaturesData(address: string, chain: ChainDto): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    await this.getStakingData(response, address, chain);

    return response;
  }

  getPositionBalance(position: IVaultPosition) {
    if ((position as IVaultV1Position).shareBalance) {
      return new BigNumber(position.shareBalance).multipliedBy(position.vault.pricePerFullShare);
    }

    return new BigNumber(position.balance).div(decimalsDivider(position.token.decimals));
  }

  async getStakingData(response: IntegrationFeaturesDataDto, address: string, chain: ChainDto) {
    const users = await this.yearnSubgraph.getVaultPositions(
      address.toLowerCase().split(','),
      chain.id,
    );

    const webProvider = this.web3Provider.getForChain(chain.abbr);
    const localMultiCall = new LocalMultiCall(webProvider, this.logger);

    await localMultiCall.injectPositionBalances(users);

    const stakedTokenAddresses = users.flatMap((user) => {
      return user.positions.map((position) => position.token.address.toLowerCase());
    });

    const prices = await this.priceService.getTokenPricesFetch(stakedTokenAddresses, chain.id);
    let totalValue = 0;

    const vaultPromises: IntegrationStakingPositionDto[] = users.flatMap((user) =>
      user.positions.flatMap((position): IntegrationStakingPositionDto => {
        const price = prices.prices[position.token.address];
        const balance = this.getPositionBalance(position);
        const value = balance.multipliedBy(price).toNumber();
        totalValue += value || 0;

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
