import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  AccountTokenBalance,
  Address,
  ChainDto,
  FeatureEnum,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset } from '../../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../../microservices/account.service';
import { PriceService } from '../../../../microservices/price.service';
import { gOhmContract } from '../contracts/gOhmContract';
import { wsOhmContract } from '../contracts/wsOhmContract';
import {
  GOVERNANCE_OHM,
  OHM_ADDRESS,
  STAKED_OHM_ADDRESS,
  WRAPPED_STAKED_OHM_ADDRESS,
} from '../olympus.constants';

@Injectable()
export class OlympusStaking {
  constructor(
    private readonly multicall: MulticallAggregator,
    protected readonly priceService: PriceService,
    protected readonly accountService: AccountService,
  ) {}

  private wsOhmBalanceLabel(address) {
    return `${address}-${WRAPPED_STAKED_OHM_ADDRESS}`;
  }
  private gOhmBalanceLabel(address) {
    return `${address}-${GOVERNANCE_OHM}`;
  }

  async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const [balances, { data }, { prices }, multicallDetails] = await Promise.all([
      this.accountService.getBalancesPost(
        addresses,
        [chain.id],
        [OHM_ADDRESS, WRAPPED_STAKED_OHM_ADDRESS, STAKED_OHM_ADDRESS, GOVERNANCE_OHM],
      ),
      this.accountService.getAssets(
        [OHM_ADDRESS, STAKED_OHM_ADDRESS, WRAPPED_STAKED_OHM_ADDRESS, GOVERNANCE_OHM],
        [chain.id],
      ),
      this.priceService.getTokenPricesFetch([OHM_ADDRESS], chain.id),
      this.getMulticallDetails(addresses, chain),
    ]);

    const tokenMap = new Map(data.map((token) => [token.address, token]));

    return addresses.map((address) => {
      const items: IntegrationStakingPositionDto[] = [];
      const sohm = tokenMap.get(STAKED_OHM_ADDRESS);
      const wsohm = tokenMap.get(WRAPPED_STAKED_OHM_ADDRESS);
      const ohm = tokenMap.get(OHM_ADDRESS);
      const gohm = tokenMap.get(GOVERNANCE_OHM);

      const sohmBalance = balances[address].tokens.find(
        (t) => t.token.address.toLowerCase() === STAKED_OHM_ADDRESS.toLowerCase(),
      );

      if (sohmBalance) {
        items.push(this.getStakingPosition(sohmBalance, sohm, Number(prices[OHM_ADDRESS]), ohm));
      }

      if (multicallDetails.has(this.wsOhmBalanceLabel(address))) {
        items.push(
          this.getIndexedPosition(
            multicallDetails.get(this.wsOhmBalanceLabel(address)),
            wsohm,
            multicallDetails.get('ratio'),
            Number(prices[OHM_ADDRESS]),
            ohm,
          ),
        );
      }

      if (multicallDetails.has(this.gOhmBalanceLabel(address))) {
        items.push(
          this.getIndexedPosition(
            multicallDetails.get(this.gOhmBalanceLabel(address)),
            gohm,
            multicallDetails.get('index'),
            Number(prices[OHM_ADDRESS]),
            ohm,
          ),
        );
      }

      return plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.olympus,
        protocolName: ProtocolNameEnum.olympus,
        userAddress: address,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.staking,
        items,
      });
    });
  }

  // dynamic redemtion value with time
  getIndexedPosition(balance: number, token: Asset, ratio: number, basePrice: number, ohm: Asset) {
    const price = basePrice * ratio;
    const value = balance * price;

    return plainToClass(IntegrationStakingPositionDto, {
      address: token.address,
      staked: balance,
      rewards: [],
      stakingToken: plainToClass(IntegrationERC20TokenDto, {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        price,
        value,
        balance: balance,
        tokens: [
          plainToClass(IntegrationPoolTokenDto, {
            address: ohm.address,
            name: ohm.name,
            symbol: ohm.symbol,
            decimals: ohm.decimals,
            price,
            value,
            balance: balance * ratio,
          }),
        ],
      }),
    });
  }

  // Redeems 1-1 with ohm
  getStakingPosition(
    balance: AccountTokenBalance,
    sohm: Asset,
    ohmPrice: number,
    ohm: Asset,
  ): IntegrationStakingPositionDto {
    return plainToClass(IntegrationStakingPositionDto, {
      address: sohm.address,
      staked: balance.decimalsAmount,
      rewards: [],
      stakingToken: plainToClass(IntegrationERC20TokenDto, {
        address: sohm.address,
        name: sohm.name,
        symbol: sohm.symbol,
        decimals: sohm.decimals,
        price: ohmPrice,
        value: ohmPrice * balance.decimalsAmount,
        balance: balance.decimalsAmount,
        tokens: [
          plainToClass(IntegrationPoolTokenDto, {
            address: ohm.address,
            name: ohm.name,
            symbol: ohm.symbol,
            decimals: ohm.decimals,
            price: ohmPrice,
            value: ohmPrice * balance.decimalsAmount,
            balance: balance.decimalsAmount,
          }),
        ],
      }),
    });
  }

  async getMulticallDetails(addresses: Address[], chain: ChainDto): Promise<Map<string, number>> {
    const wsOhm = new wsOhmContract(WRAPPED_STAKED_OHM_ADDRESS);
    const gOhm = new gOhmContract(GOVERNANCE_OHM);
    const calls = new Map();
    calls.set('ratio', wsOhm.wOHMTosOHM('1000000000000000000'));

    addresses.forEach((address) => {
      calls.set(this.wsOhmBalanceLabel(address), wsOhm.balanceOf(address));
      calls.set(this.gOhmBalanceLabel(address), gOhm.balanceOf(address));
    });

    calls.set('index', gOhm.index());

    const rawResults = await this.multicall.handleInBatches(calls, chain.id);

    const results = new Map();

    results.set('ratio', normalizeDecimals(rawResults.get('ratio').output.data.toString(), 9));
    results.set('index', normalizeDecimals(rawResults.get('index').output.data.toString(), 9));

    addresses.forEach((address) => {
      const wsOhmBalance = normalizeDecimals(
        rawResults.get(this.wsOhmBalanceLabel(address)).output.data.toString(),
        18,
      );
      const gOhmBalance = normalizeDecimals(
        rawResults.get(this.gOhmBalanceLabel(address)).output.data.toString(),
        18,
      );
      if (wsOhmBalance) {
        results.set(this.wsOhmBalanceLabel(address), wsOhmBalance);
      }
      if (gOhmBalance) {
        results.set(this.gOhmBalanceLabel(address), gOhmBalance);
      }
    });

    return results;
  }
}
