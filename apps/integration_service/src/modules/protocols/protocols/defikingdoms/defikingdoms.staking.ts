import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ClaimableDto,
  ICallData,
  Logger,
  ProtocolNameEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  FeatureEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  DefiKingdomsProtocolEnum,
  ChainIdEnum,
} from '@app/common/enum';
import {
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { concatStrings } from '@app/common/utils';
import { toDecimals } from '../../../../common/utils/util';
import { Web3Provider } from '../../../chains/web3.provider';
import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { PriceService } from '../../../microservices/price.service';
import { decimalsDivider } from '@app/common/utils';
import { Abis } from './contracts/abis';

@Injectable()
export class DefiKingdomsStaking {
  private readonly masterGardener = '0xdb30643c71ac9e2122ca0341ed77d09d5f99f924';
  private readonly xJEWEL = '0xa9ce83507d872c5e1273e745abcfda849daa654f';
  private readonly JEWEL = '0x72cb10c6bfa5624dd07ef608027e366bd690048f';

  static startBlock: number = 19_071_967; // start of the 10th epoch
  static epochDuration: number = 302400;

  private readonly multicallService: MulticallService;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly priceService: PriceService,
    private readonly multicallProvider: MulticallProvider,
    private readonly web3Provider: Web3Provider,
  ) {
    this.multicallService = multicallProvider.getForChain(ChainAbbrEnum.harm);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${DefiKingdomsProtocolEnum.defikingdoms}_${FeatureEnum.staking}`;
    
    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const multicallData = await this.getDataWithMulticall(addresses, pools);
    const lockPercent = await this.getLockPercent();

    const base: BaseDataStaking[] = await Promise.all(addresses.map(async (a) => {
      const baseInfo: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.defikingdoms,
        protocolName: ProtocolNameEnum.defikingdoms,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.staking,
        items: [],
      });

      const userMulticallData = this.getMulticallDataForAddress(multicallData, a);

      const userStakingPositions: IntegrationStakingPositionDto[] =
        this.getStakingPositionsForAddress(userMulticallData, pools, lockPercent);

      baseInfo.items.push(...userStakingPositions);
      const bankData = await this.getBankData(a);
      bankData && baseInfo.items.push(bankData);
      return baseInfo;
    }));

    return base;
  }

  private async getDataWithMulticall(addresses: Address[], pools: NotifyStaking) {
    const calls = new Map<string, ICallData>();
    const contract = new Abis(this.masterGardener);

    addresses.forEach(address => {
      pools.items.forEach(pool => {
        calls.set(this.contractCallLabel(address, pool.address, pool.poolId), {
          address: pool.address,
          abi: Abis.userInfo,
          input: {
            data: [pool.poolId, address],
          },
          output: {},
        });
      });
    });

    const userBalances: Map<string, ICallData> = await this.multicallService.handleInBatches(calls);

    const balances: {
      id: string;
      poolId: number;
      balance: string;
      contract: string;
      pendingJewel?: BigNumber;
      user: {
        address: string;
      };
    }[] = [];

    userBalances.forEach((callData, contractCallLabel) => {
      if (Number(callData.output.data.amount) > 0) {
        const [userAddress, poolAddress, poolId] = contractCallLabel.split('_');
        balances.push({
          id: contractCallLabel,
          poolId: Number(poolId),
          contract: poolAddress,
          balance: callData.output.data.amount,
          user: {
            address: userAddress,
          },
        });
      }
    });
    
    const pendingTokensCalls = new Map<string, ICallData>(
      balances.map((b) => [this.contractCallLabel(b.user.address, b.contract, b.poolId), contract.pendingReward(b.poolId, b.user.address)])
    );

    const claimableRewardsRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      pendingTokensCalls,
    );

    balances.forEach((d) => {
      const claimableReward = claimableRewardsRsp.get(
        this.contractCallLabel(d.user.address, d.contract, d.poolId),
      ).output.data;
      d.pendingJewel = new BigNumber(claimableReward.toString());
    });

    return balances;
  }

  private async getBankData(userAddress: string) {
    const bankContract = new Abis(this.xJEWEL);

    const call = new Map<string, ICallData>([[Abis.balanceOf.name, bankContract.balanceOf(userAddress)]]);

    const bankBalanceCall: Map<string, ICallData> = await this.multicallService.handleInBatches(
      call,
    );

    const balance = bankBalanceCall.get(Abis.balanceOf.name).output.data;

    if (!Number(balance)) {
      return;
    }

    const stakingToken = plainToClass(IntegrationERC20TokenDto, {
      address: this.xJEWEL,
      name: 'xJewel',
      symbol: 'xJEWEL',
      decimals: 18,
      totalSupply: await this.getTotalSupply(this.xJEWEL),
    });

    const token = plainToClass(IntegrationPoolTokenDto, {
      address: this.JEWEL,
      name: 'Jewel',
      symbol: 'JEWEL',
      decimals: 18,
      totalSupply: await this.getTotalSupply(this.JEWEL),
      positionInPool: 0,
    });

    const { prices } = await this.priceService.getTokenPricesFetch(
      [this.JEWEL],
      ChainIdEnum.harm,
    );

    const xJEWELPrice = await this.calcXJEWELPrice(Number(prices[this.JEWEL]));

    stakingToken.tokens.push(token);
    stakingToken.tokens[0].price = Number(prices[this.JEWEL]);

    const xJEWEL = plainToClass(IntegrationStakingPositionDto, {
      address: this.xJEWEL,
      stakingToken,
    });

    return this.toPosition(balance, xJEWEL, xJEWELPrice);
  }

  private toPosition(
    balance: number,
    stakingData: IntegrationStakingPositionDto,
    xJEWELPrice: number,
  ): IntegrationStakingPositionDto {
    stakingData.staked = balance.toString();
    stakingData.stakingToken.balance = toDecimals(balance, 18);
    stakingData.stakingToken.price = xJEWELPrice;
    stakingData.stakingToken.value = xJEWELPrice * stakingData.stakingToken.balance;
    stakingData.stakingToken.tokens[0].balance =
      stakingData.stakingToken.value / stakingData.stakingToken.tokens[0].price;

    stakingData.stats.tvl = stakingData.stakingToken.totalSupply * xJEWELPrice;

    return stakingData;
  }

  private async calcXJEWELPrice(jewelPrice: number) {
    const jewelContract = new Abis(this.JEWEL);
    const bankContract = new Abis(this.xJEWEL);

    const calls = new Map<string, ICallData>([
      [Abis.balanceOf.name, jewelContract.balanceOf(this.xJEWEL)],
      [Abis.totalSupply.name, bankContract.totalSupply()],
    ]);

    const callRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      calls,
    );

    const xJEWELQuantity = toDecimals(callRsp.get(Abis.totalSupply.name).output.data, 18);
    const JEWELQuantity = toDecimals(callRsp.get(Abis.balanceOf.name).output.data, 18);

    return (JEWELQuantity / xJEWELQuantity) * jewelPrice;
  }

  private getMulticallDataForAddress(multicallData, userAddress: string) {
    const balances = multicallData.filter((b) => b.user.address === userAddress);

    return balances;
  }

  private getStakingPositionsForAddress(balances, pools: NotifyStaking, lockPercent: number) {
    const stakingPositionMap = new Map<string, IntegrationStakingPositionDto>(
      pools.items.map(p => [`${p.poolId}_${p.address}`, p])
    );

    const stakingPositions: IntegrationStakingPositionDto[] = balances.map((b) => {
      const stakingPosition: IntegrationStakingPositionDto = stakingPositionMap.get(`${b.poolId}_${b.contract}`);

      const stakedBigNumber = new BigNumber(b.balance).div(
        decimalsDivider(stakingPosition.stakingToken.decimals),
      );
      stakingPosition.stakingToken.balance = stakedBigNumber.toNumber();

      if (stakingPosition.stakingToken.tokens) {
        const poolShare = stakedBigNumber.div(new BigNumber(stakingPosition.stakingToken.totalSupply));
        stakingPosition.stakingToken.tokens.forEach((clpt) => {
          clpt.balance = poolShare.times(new BigNumber(clpt.reserve)).toNumber();
        });
      }

      stakingPosition.staked = b.balance;

      if (b.pendingJewel) {
        stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
        stakingPosition.rewards[0].claimableData.balance = b.pendingJewel
          .div(decimalsDivider(stakingPosition.rewards[0].decimals))
          .toString();
        stakingPosition.rewards[0].claimableData.lockedBalance = 
          (Number(stakingPosition.rewards[0].claimableData.balance) * lockPercent).toString();
      }

      return stakingPosition;
    });

    return stakingPositions;
  }

  private async getTotalSupply(address: string) {
    const contract = new Abis(address);
    const totalSupplyCall = new Map<string, ICallData>();
    totalSupplyCall.set(address, contract.totalSupply());

    const totalSupplyRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      totalSupplyCall,
    );
    return toDecimals(totalSupplyRsp.get(address).output.data, 18);
  }

  private async getLockPercent() {
    const masterGardener = new Abis(this.masterGardener);
    const currentEpoch = await this.getCurrentEpoch();

    const call = new Map<string, ICallData>();
    call.set(Abis.getLockPercent.name, masterGardener.getLockPercent(currentEpoch - 1));

    const lockPercentCall: Map<string, ICallData> = await this.multicallService.handleInBatches(
      call,
    );
    return lockPercentCall.get(Abis.getLockPercent.name).output.data / 100;
  }

  private async getCurrentEpoch() {
    const currentBlock = await this.web3Provider.getForChain(ChainAbbrEnum.harm).eth.getBlockNumber();

    return 10 + ~~((currentBlock - DefiKingdomsStaking.startBlock) / DefiKingdomsStaking.epochDuration);
  }

  private contractCallLabel(address: string, contract: string, poolId: number) {
    return concatStrings(address, contract, poolId);
  }
}
