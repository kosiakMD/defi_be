import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ChainIdEnum,
  FeatureEnum,
  ICallData,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import { toDecimals } from '../../../../common/utils/util';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { PriceService } from '../../../microservices/price.service';
import { TraderjoeAbis } from './contracts/traderjoe.abis';

@Injectable()
export class TraderJoeFarm {
  private readonly multicallService: MulticallService;
  xJOEAddress = '0x57319d41f71e81f3c65f2a47ca4e001ebafd4f33';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly multicallProvider: MulticallProvider,
    private readonly priceService: PriceService,
  ) {
    this.multicallService = multicallProvider.getForChain(ChainAbbrEnum.avax);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const xJOEStaking = await this.getStakingPosition();

    const baseData: BaseDataStaking[] = await Promise.all(addresses.map(async (a) => {
      const userBalance = await this.getBalanceOf(a);

      const toAdd: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain: chain,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        projectName: ProjectEnum.traderjoe,
        items: [],
        feature: FeatureEnum.farming,
      });
      
      if (Number(userBalance) > 0) {
        toAdd.items = [this.toPosition(userBalance, xJOEStaking)];
      }

      return toAdd;
    }));

    return baseData;
  }

  private async getStakingPosition(): Promise<IntegrationStakingPositionDto> {
    const stakingToken = plainToClass(IntegrationERC20TokenDto, {
      address: this.xJOEAddress,
      name: 'JoeBar',
      symbol: 'xJOE',
      decimals: 18,
      totalSupply: await this.getTotalSupply(this.xJOEAddress),
    });

    const { prices } = await this.priceService.getTokenPricesFetch(
      [this.xJOEAddress],
      ChainIdEnum.avax,
    );

    stakingToken.price = prices[this.xJOEAddress];

    const xJOE = plainToClass(IntegrationStakingPositionDto, {
      address: this.xJOEAddress,
      stakingToken,
    });

    return xJOE;
  }

  private toPosition(
    balance: number,
    stakingData: IntegrationStakingPositionDto,
  ): IntegrationStakingPositionDto {
    stakingData.staked = balance.toString();
    stakingData.stakingToken.balance = toDecimals(balance, 18);

    stakingData.stats.tvl = stakingData.stakingToken.totalSupply * stakingData.stakingToken.price;

    return stakingData;
  }

  private async getTotalSupply(address: string) {
    const totalSupplyCall = new Map<string, ICallData>();
    totalSupplyCall.set(address, {
      address: address,
      abi: TraderjoeAbis.totalSupply,
      input: {
        data: [],
      },
      output: {},
    });

    const totalSupplyRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      totalSupplyCall,
    );
    return toDecimals(totalSupplyRsp.get(address).output.data, 18);
  }

  private async getBalanceOf(userAddress: string) {
    const xJOEContract = new TraderjoeAbis(this.xJOEAddress);

    const balanceCall = new Map<string, ICallData>([
      [userAddress, xJOEContract.balanceOf(userAddress)]
    ]);

    const balanceRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      balanceCall,
    );
    
    return balanceRsp.get(userAddress).output.data;
  }
}
