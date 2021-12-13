import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  Address,
  ChainDto,
  FeatureEnum,
  FeatureResultDto,
  IntegrationFeaturesDataDto,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { decimalsDivider } from '@app/common/utils';

import {
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
} from '../../../../common/dto/integrations.dto';
import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { Web3Provider } from '../../../chains/web3.provider';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { YearnV1Subgraph } from '../../../subgraphs/subgraphs/yearn.v1.subgraph';
import { YearnV2Subgraph } from '../../../subgraphs/subgraphs/yearn.v2.subgraph';
import BasicProtocol from '../basicProtocol';
import { IVaultPosition, IVaultV1Position } from './yearn.interfaces';
import { YearnLocalMultiCall } from './yearn.local.multi.call';

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

  abstract getAllFeaturesData(
    address: Address,
    chain: ChainDto,
  ): Promise<IntegrationFeaturesDataDto>;

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const userData = await Promise.allSettled(
      addresses.flatMap((address) => {
        return this.getAsBaseData(address, chain);
      }),
    );

    const data = [];
    const errors = [];
    userData.forEach((r) => {
      if (r.status === 'fulfilled') {
        data.push(r.value);
      } else {
        this.logger.error(r.reason, r.reason.stack, this.name);
        errors.push(r.reason.toString());
      }
    });

    return [data.flat(), errors];
  }

  async getAsBaseData(address: Address, chain: ChainDto): Promise<BaseData[]> {
    const data = await this.getAllFeaturesData(address, chain);
    const response: BaseData[] = [];
    const factory = this.createBaseObjectFactory(address, chain, data);

    if (data[FeatureEnum.staking]) {
      response.push(
        plainToClass(
          BaseDataStaking, //
          factory(ProtocolTypeEnum.staking, FeatureEnum.staking),
        ),
      );
    }

    if (data[FeatureEnum.lending]) {
      response.push(
        plainToClass(
          BaseDataLending, //
          factory(ProtocolTypeEnum.lending, FeatureEnum.lending),
        ),
      );
    }

    if (data[FeatureEnum.borrowing]) {
      response.push(
        plainToClass(
          BaseDataLending, //
          factory(ProtocolTypeEnum.borrowing, FeatureEnum.borrowing),
        ),
      );
    }

    return response;
  }

  createBaseObjectFactory(
    address: Address,
    chain: ChainDto,
    featureData: IntegrationFeaturesDataDto,
  ) {
    return (protocolType: ProtocolTypeEnum, feature: FeatureEnum) => {
      return {
        chain,
        userAddress: address,
        protocolType,
        projectName: ProjectEnum.yearn,
        protocolName: this.name,
        total: featureData[feature].totalValue,
        feature,
        items: featureData[feature].items,
      };
    };
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
    const localMultiCall = new YearnLocalMultiCall(webProvider, this.logger);

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
