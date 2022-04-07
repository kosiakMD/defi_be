import { LCDClient } from '@terra-money/terra.js';
import axios from 'axios';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  FeatureEnum,
  IAssetResponseDto,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { IntegrationERC20TokenDto, IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { Web3ProviderService } from '@app/common/web3provider';

import { toDecimals } from '../../../../common/utils/util';

import { AccountService } from '../../../microservices/account.service';
import { StaderAddresses } from './stader.addresses';

@Injectable()
export class StaderDelegationStaking {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private web3ProviderService: Web3ProviderService,
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
  ) {}
  public async getData(addresses: Address[], chain: ChainDto) {
    const [delegationStakings, terraValidators] = await Promise.all([
      this.getDelegationStakingData(chain),
      this.getTerraValidatorsData(),
    ]);

    const validatorsMap: Map<string, Validator> = terraValidators.reduce((resp, validator) => {
      resp.set(validator.operator_address, validator);
      return resp;
    }, new Map());

    const lunaToken = await this.accountService.getTrackedAssets(StaderAddresses.luna, chain.id);
    const provider: LCDClient = this.web3ProviderService.getInstanceByChainId(chain.id);

    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [a, this.getStakingBaseData(a, chain)]),
    );
    await Promise.all(
      addresses.map(async (address) => {
        const userBaseStakingData = baseDataStakingMap.get(address);
        userBaseStakingData.items = await this.getUserStakingPositions(
          address,
          delegationStakings,
          provider,
          lunaToken,
          validatorsMap,
        );
      }),
    );
    return Array.from(baseDataStakingMap.values());
  }

  async getUserStakingPositions(
    address: Address,
    delegationStakings: StakePlusContracts[],
    provider: LCDClient,
    lunaToken: IAssetResponseDto,
    validatorsMap: Map<string, any>,
  ) {
    const stakingPositions = [];
    await Promise.all(
      delegationStakings.map(async (delegation) => {
        // eslint-disable-next-line camelcase
        const { user_info } = await provider.wasm.contractQuery(delegation.staking_contract, {
          // eslint-disable-next-line camelcase
          get_user_info: {
            // eslint-disable-next-line camelcase
            user_addr: address,
          },
        });

        // eslint-disable-next-line camelcase
        if (Number(user_info.total_shares) > 0) {
          const stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
            address: lunaToken.address,
            name: lunaToken.name,
            symbol: lunaToken.symbol,
            decimals: lunaToken.decimals,
            // eslint-disable-next-line camelcase
            balance: toDecimals(user_info.total_shares, lunaToken.decimals),
          });

          const validator = validatorsMap.get(delegation.operator_address);

          const stakingPoolFeature: IntegrationStakingPositionDto = plainToClass(
            IntegrationStakingPositionDto,
            {
              address: delegation.staking_contract,
              poolId: delegation.id,
              poolName: validator?.description.moniker,
              staked: stakingToken.balance,
              rewards: [],
              stakingToken: stakingToken,
            },
          );
          stakingPositions.push(stakingPoolFeature);
        }
      }),
    );
    return stakingPositions;
  }

  async getDelegationStakingData(chain: ChainDto): Promise<StakePlusContracts[]> {
    const provider = this.web3ProviderService.getInstanceByChainId(chain.id);
    const { contracts } = await provider.wasm.contractQuery(StaderAddresses.contractPlusStaker, {
      // eslint-disable-next-line camelcase
      get_stake_plus_contracts: {},
    });
    return contracts;
  }

  async getTerraValidatorsData() {
    try {
      const terraUrl = this.configService.get<string>('TERRA_URL');
      const { data } = await axios.get(
        `${terraUrl}/cosmos/staking/v1beta1/validators?pagination.limit=999`,
      );

      return data.validators;
    } catch (e) {
      this.logger.error(e, 'getTerraValidatorsData');
      throw e;
    }
  }

  getStakingBaseData(address: string, chain: ChainDto) {
    return plainToClass(BaseDataStaking, {
      chain: chain,
      userAddress: address,
      protocolType: ProtocolTypeEnum.delegation,
      projectName: ProjectEnum.stader,
      feature: FeatureEnum.delegation,
      items: [],
    });
  }
}

export interface StakePlusContracts {
  id: number;
  operator_address: string;
  staking_contract: string;
  airdrops_sink_contract: string;
  reward_contract: string;
  contract_type: string;
  create_time: string;
  update_time: string;
}

export interface Validator {
  operator_address: string;
  status: string;
  tokens: string;
  delegator_shares: string;
  description: {
    moniker: string;
    website: string;
  };
}
