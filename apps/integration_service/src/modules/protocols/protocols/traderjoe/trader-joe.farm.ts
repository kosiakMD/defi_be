import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  AccountBalance,
  Address,
  BalancesResponse,
  ChainAbbrEnum,
  ChainDto,
  ChainIdEnum,
  FeatureEnum,
  ICallData,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
  TokenBalance,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import { toDecimals } from '../../../../common/utils/util';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { TraderjoeAbis } from './contracts/traderjoe.abis';

@Injectable()
export class TraderJoeFarm {
  private readonly multicallService: MulticallService;
  xJOEAddress = '0x57319d41f71e81f3c65f2a47ca4e001ebafd4f33';
  JOEAddress = '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
    private readonly multicallProvider: MulticallProvider,
    private readonly priceService: PriceService,
  ) {
    this.multicallService = multicallProvider.getForChain(ChainAbbrEnum.avax);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const lpBalances: BalancesResponse = await this.accountService.getBalancesPost(
      addresses,
      [ChainIdEnum.avax],
      [this.xJOEAddress],
    );

    const xJOEStaking = await this.getStakingPosition();

    const baseData: BaseDataStaking[] = addresses.map((a) => {
      const toAdd: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain: chain,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        projectName: ProjectEnum.traderjoe,
        items: [],
        feature: FeatureEnum.farming,
      });

      const existedPositions = this.toStaking(lpBalances[a], [xJOEStaking]);
      if (existedPositions.length > 0) {
        toAdd.items = existedPositions;
      }

      return toAdd;
    });

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

    const token = plainToClass(IntegrationPoolTokenDto, {
      address: this.JOEAddress,
      name: 'Joe',
      symbol: 'JOE',
      decimals: 18,
      totalSupply: await this.getTotalSupply(this.JOEAddress),
      positionInPool: 0,
    });

    const { prices } = await this.priceService.getTokenPricesFetch(
      [this.JOEAddress, this.xJOEAddress],
      ChainIdEnum.avax,
    );

    stakingToken.tokens.push(token);
    stakingToken.tokens[0].price = Number(prices[this.JOEAddress]);

    const xJOE = plainToClass(IntegrationStakingPositionDto, {
      address: this.xJOEAddress,
      stakingToken,
    });

    return xJOE;
  }

  private toStaking(
    lpBalance: AccountBalance,
    cachedStakingPos: IntegrationStakingPositionDto[],
  ): IntegrationStakingPositionDto[] {
    const cachedStakingPosMap: Map<string, any> = new Map<string, any>(
      cachedStakingPos.map((i) => [i.address, i]),
    );

    return lpBalance.tokens.map((tb) => {
      if (tb.decimalsAmount > 0) {
        return this.toPosition(tb, cachedStakingPosMap.get(tb.token.address));
      }
    });
  }

  private toPosition(
    balance: TokenBalance,
    stakingData: IntegrationStakingPositionDto,
  ): IntegrationStakingPositionDto {
    const userData = stakingData;
    userData.staked = balance.amount;
    userData.stakingToken.balance = balance.decimalsAmount;
    userData.stakingToken.price = balance.tokenPriceUSD;
    userData.stakingToken.value = balance.tokenPriceUSD * userData.stakingToken.balance;
    userData.stakingToken.tokens[0].balance =
      userData.stakingToken.value / userData.stakingToken.tokens[0].price;

    userData.stats.tvl = stakingData.stakingToken.totalSupply * balance.tokenPriceUSD;

    return userData;
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
}
