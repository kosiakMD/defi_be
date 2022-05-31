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
import { IntegrationERC20TokenDto, IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset } from '../../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../../microservices/account.service';
import { PriceService } from '../../../../microservices/price.service';
import { WMemoContract } from '../contracts/wMemo-contract';
import { MEMO_ADDRESS, TIME_ADDRESS, WRAPPED_MEMO_ADDRESS } from '../wonderland.constants';

@Injectable()
export class WonderlandStaking {
  constructor(
    private readonly multicall: MulticallAggregator,
    protected readonly priceService: PriceService,
    protected readonly accountService: AccountService,
  ) {}

  async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    // memo holder: 0xe1e89a0824039caaa648f619b2a3e7bf6d7e2ace
    // wmemo holder: 0x35ece33facc6b2a2b2284394fed1870268f95134
    // on avax, get memo balance, get wmemo balance
    const [balances, { data }, { prices }, wMemoDetails] = await Promise.all([
      this.accountService.getBalancesPost(
        addresses,
        [chain.id],
        [TIME_ADDRESS, MEMO_ADDRESS, WRAPPED_MEMO_ADDRESS],
      ),
      this.accountService.getAssets([TIME_ADDRESS, MEMO_ADDRESS, WRAPPED_MEMO_ADDRESS], [chain.id]),
      this.priceService.getTokenPricesFetch([TIME_ADDRESS], chain.id),

      this.getWmemoDetails(addresses, chain),
    ]);

    const tokenMap = new Map(data.map((token) => [token.address, token]));

    return addresses.map((address) => {
      const items: IntegrationStakingPositionDto[] = [];
      const memo = tokenMap.get(MEMO_ADDRESS);
      const wMemo = tokenMap.get(WRAPPED_MEMO_ADDRESS);

      const memoBalance = balances[address].tokens.find((t) => t.token.address === MEMO_ADDRESS);

      if (memoBalance) {
        items.push(this.getMemoStakingPosition(memoBalance, memo, Number(prices[TIME_ADDRESS])));
      }

      if (wMemoDetails.has(address)) {
        items.push(
          this.getWrappedMemoStakingPosition(
            wMemoDetails.get(address),
            wMemo,
            wMemoDetails.get('ratio'),
            Number(prices[TIME_ADDRESS]),
          ),
        );
      }

      return plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.wonderland,
        protocolName: ProtocolNameEnum.wonderland,
        userAddress: address,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.staking,
        items,
      });
    });
  }

  // dynamic redemtion value with time
  getWrappedMemoStakingPosition(balance: number, wmemo: Asset, ratio: number, timePrice: number) {
    const price = timePrice * ratio;
    const value = balance * price;
    return plainToClass(IntegrationStakingPositionDto, {
      address: wmemo.address,
      staked: balance,
      rewards: [],
      stakingToken: plainToClass(IntegrationERC20TokenDto, {
        address: wmemo.address,
        name: wmemo.name,
        symbol: wmemo.symbol,
        decimals: wmemo.decimals,
        price,
        value,
        balance: balance,
        tokens: [],
      }),
    });
  }

  // Redeems 1-1 with time
  getMemoStakingPosition(
    balance: AccountTokenBalance,
    memo: Asset,
    timePrice: number,
  ): IntegrationStakingPositionDto {
    return plainToClass(IntegrationStakingPositionDto, {
      address: memo.address,
      staked: balance.decimalsAmount,
      rewards: [],
      stakingToken: plainToClass(IntegrationERC20TokenDto, {
        address: memo.address,
        name: memo.name,
        symbol: memo.symbol,
        decimals: memo.decimals,
        price: timePrice,
        value: timePrice * balance.decimalsAmount,
        balance: balance.decimalsAmount,
        tokens: [],
      }),
    });
  }

  async getWmemoDetails(addresses: Address[], chain: ChainDto): Promise<Map<string, number>> {
    const contract = new WMemoContract(WRAPPED_MEMO_ADDRESS);
    const calls = new Map();
    calls.set('ratio', contract.wMEMOToMEMO('1000000000000000000'));

    addresses.forEach((address) => {
      calls.set(address, contract.balanceOf(address));
    });
    const rawResults = await this.multicall.handleInBatches(calls, chain.id);

    const results = new Map();
    results.set('ratio', normalizeDecimals(rawResults.get('ratio').output.data.toString(), 9));
    addresses.forEach((address) => {
      const balance = normalizeDecimals(rawResults.get(address).output.data.toString(), 18);
      if (balance) {
        results.set(address, balance);
      }
    });

    return results;
  }
}
