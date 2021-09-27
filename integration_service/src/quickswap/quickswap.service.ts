import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { Logger } from 'src/Logger/Logger.service';
import { IncomeLiquidityPosition } from 'src/dto/liquidity.position.dto';
import { BaseData } from 'src/interfaces/transactions.interfaces';

import { Injectable } from '@nestjs/common';

import { ChainIdEnum, ProjectEnum } from 'src/common/enum';
import { Address } from 'src/common/types';
import { BalancesResponse } from 'src/common/types/balances';

import { AccountService } from '../account/account.service';
import { IntegrationClaimableTokenDto } from '../integrations/integrations.dto';
import { Mapper } from '../mappers/mapper';
import { QuickswapSubgraph } from '../thegraph/quickswap.subgraph';
import { decimalsDivider, getUniqueAndToLowerCaseArrayData } from '../utils/util';
import { MultiCallService } from './multicall/multicall.service';
import { QUICKSWAP_REWARDS_TOKEN_ADDRESS, QUICKSWAP_STAKING_CONTRACTS } from './utils/constants';
import { getContractByPair } from './utils/utils';

@Injectable()
export class QuickswapService {
  constructor(
    private readonly mapper: Mapper,
    private readonly accountService: AccountService,
    private readonly quickswapSubgraph: QuickswapSubgraph,
    private readonly logger: Logger,
    private readonly multicall: MultiCallService,
  ) {}

  private mapTokenAddressesFromResponse(
    response: BalancesResponse,
    addresses: Address[],
  ): Record<Address, Address[]> {
    const tokensByAccount = new Map<Address, Address[]>();

    addresses.forEach((address) => {
      const tokens = new Set<Address>();

      response[address]?.tokens.forEach(({ token }) => tokens.add(token.address));

      tokensByAccount.set(address, [...tokens]);
    });

    return Object.fromEntries(tokensByAccount);
  }

  async getDataByAddresses(addresses: string, chainId?: ChainIdEnum): Promise<BaseData[]> {
    try {
      const originAddresses = addresses.split(',');
      const uniqueAddresses = getUniqueAndToLowerCaseArrayData(originAddresses);

      const balancesByAccount = await this.accountService.getBalances(uniqueAddresses, [chainId]);
      const tokenAddressesByAccount = this.mapTokenAddressesFromResponse(
        balancesByAccount,
        uniqueAddresses,
      );

      const uniswapLiquidityPositions = new Map<Address, IncomeLiquidityPosition[]>();
      const sushiswapStakingPosition = new Map<Address, any>();

      for (const address of uniqueAddresses) {
        const {
          data: { pairs: _pairs },
        } = await this.quickswapSubgraph.getPairs(tokenAddressesByAccount[address]);

        const pairs = await Promise.all(
          _pairs.map(async (pair) => ({
            liquidityTokenBalance: await this.multicall.getBalanceOf(pair.id, address),
            user: address,
            pair,
          })),
        );
        uniswapLiquidityPositions.set(address, pairs);

        const { data: rewardTokens } = await this.accountService.getAssets(
          [QUICKSWAP_REWARDS_TOKEN_ADDRESS],
          [chainId],
        );

        const stakingPosition = await Promise.all(
          QUICKSWAP_STAKING_CONTRACTS.map(async ({ pairAddress }) => {
            const balance = await this.multicall.getBalanceOf(
              getContractByPair(pairAddress),
              address,
            );
            const claimable = await this.multicall.getClaimable(
              getContractByPair(pairAddress),
              address,
            );

            const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
              ...rewardTokens[0],
              claimableData: {
                balance: new BigNumber(claimable) //
                  .div(decimalsDivider(18))
                  .toString(),
                value: new BigNumber(balance) //
                  .div(decimalsDivider(18))
                  .toString(),
              },
            });

            rewardToken.claimableData;

            const stakingToken = {
              address: pairAddress,
              name: 'Uniswap V2',
              symbol: 'UNI-V2',
              decimals: 18,
              tokens: [],
            };

            const LPStakingTokensAddresses = await this.multicall.getStakingTokensAddresses(
              pairAddress,
            );

            const { data: LPStakingTokens } = await this.accountService.getAssets(
              LPStakingTokensAddresses,
              [chainId],
            );

            stakingToken.tokens.push(...LPStakingTokens);

            return {
              address,
              staked: new BigNumber(balance) //
                .div(decimalsDivider(18))
                .toString(),
              rewardToken,
              stakingToken,
            };
          }),
        );

        sushiswapStakingPosition.set(
          address,
          stakingPosition.filter((_) => +_.staked),
        );
      }

      return await this.mapper.mapData(
        uniqueAddresses,
        originAddresses,
        {
          uniswapLiquidityPositions,
          sushiswapStakingPosition,
        },
        ProjectEnum.quickswap,
      );
    } catch (error) {
      this.logger.error(error, 'QuickswapService.getDataByAddress');
      throw new Error(error);
    }
  }
}
