import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';
import { firstValueFrom, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { aprToApy, gql, normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { FakeAssetService } from '../../../../../modules/microservices/fake.asset.service';
import { erc20Fields } from '../../../../../modules/protocols/protocols/sushiswap/queries/fragments/token.fragment';
import { ISushiSwapBentoBoxUsers } from '../../../../../modules/protocols/protocols/sushiswap/sushiswap.interfaces';
import { FeatureEnum } from '../../../enums';
import {
  IProtocolMeta,
  IRootProtocol,
  IUserDataProtocolResponse,
  TokenMap,
} from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { IBorrowTokenUserEntity } from '../../../interfaces/tokens.borrowed.interface';
import { ERC20TokenMinimal, ITokenOpportunity } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { EVMCore } from '../../EVMCore';

type ISushiLendingFeatureEntryMinimal = BaseWithTokens<
  ISushiSupplyTokenMinimal[],
  void,
  ISushiBorrowTokenMinimal[]
>;

export interface ISushiTokenMinimal {
  token: ERC20TokenMinimal;
}

export interface ISushiBorrowTokenMinimal extends ISushiTokenMinimal {
  totalBorrowed: string;
  borrowApr: string;
}

export interface ISushiSupplyTokenMinimal extends ISushiTokenMinimal {
  totalSupplied: string;
  supplyApr: string;
  isCollateral: boolean;
}

export type ISushiLendingMeta = IProtocolMeta & {
  subgraphUrl: string;
  pairsPerQuery: number;
};

export interface ISushiSupplyTokenOpportunity extends ISupplyTokenOpportunity {
  isCollateral: boolean;
}

export interface ISushiBorrowTokenUserEntity extends IBorrowTokenUserEntity {
  healthFactor?: number;
}

export interface ISushiSupplyTokenUserEntry extends ISupplyTokenUserEntry {
  isCollateral?: boolean;
}

type ISushiLendingFeatureOpportunity = BaseWithTokens<
  ISushiSupplyTokenOpportunity[],
  void,
  ISushiBorrowTokenOpportunity[]
>;

type ISushiLendingFeatureUserEntry = BaseWithTokens<
  ISushiSupplyTokenUserEntry[],
  void,
  ISushiBorrowTokenUserEntity[]
> & { debtRatio: number };

export interface ISushiBorrowTokenOpportunity extends ITokenOpportunity {
  totalBorrowed: number;
  tvl: number;
  apy: { year: number };
}

export const getLendingPositionsQuery = gql`
  ${erc20Fields}
  query getLendingPositions($addresses: [String]) {
    users(where: { id_in: $addresses }) {
      kashiPairs {
        borrowPart
        collateralShare
        assetFraction
        pair {
          id
        }
      }

      tokens(where: { share_gt: 0 }) {
        share
        token {
          ...erc20Fields
        }
      }
    }
  }
`;

export const LENDING_OPPORTUNITY_QUERY = gql`
  ${erc20Fields}
  query ($first: Int!, $skip: Int!) {
    bentoBoxes {
      kashiPairs(first: $first, skip: $skip, where: { totalAssetBase_gt: 0 }) {
        asset {
          ...erc20Fields
        }
        collateral {
          ...erc20Fields
        }
        supplyAPR
        totalAssetBase
        totalAssetElastic
        totalBorrowBase
        totalBorrowElastic
        totalCollateralShare
        type
        utilization
        borrowAPR
        exchangeRate
        id
      }
    }
  }
`;

export class SushiswapLending
  extends EVMCore<
    ISushiLendingFeatureEntryMinimal,
    ISushiLendingFeatureOpportunity,
    ISushiLendingFeatureUserEntry,
    ISushiLendingMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: FakeAssetService,
    protected httpService: HttpService,
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<ISushiLendingFeatureEntryMinimal[]> {
    const pairsResult = await this.loadLendingPoolsSubgraphData(
      LENDING_OPPORTUNITY_QUERY,
      this.meta.pairsPerQuery,
    );
    return pairsResult.map((pool) => this.toFeatureEntryMinimal(pool));
  }

  private async loadLendingPoolsSubgraphData(rawQuery, numberPerQuery) {
    let collectedData = [];
    let responseSize = numberPerQuery;
    let skip = 0;
    do {
      const $data = this.httpService
        .post(this.meta.subgraphUrl, {
          query: rawQuery,
          variables: {
            first: this.meta.pairsPerQuery,
            skip: skip,
          },
        })
        .pipe(
          mergeMap((rsp) => {
            return rsp.data.data.bentoBoxes[0].kashiPairs;
          }),
          toArray(),
        );
      const result = await firstValueFrom($data);
      skip += this.meta.pairsPerQuery;
      responseSize = result.length;
      collectedData = collectedData.concat(result);
    } while (responseSize === this.meta.pairsPerQuery);
    return collectedData;
  }

  private toFeatureEntryMinimal(
    pool: SubgraphOpportunityMinimal,
  ): ISushiLendingFeatureEntryMinimal {
    return {
      feature: this.meta.feature,
      chain: this.meta.chain,
      id: pool.id,
      supplied: [
        {
          token: {
            address: pool.asset.id,
          },
          totalSupplied: pool.totalAssetBase,
          supplyApr: pool.supplyAPR,
          isCollateral: false,
        },
        {
          token: {
            address: pool.collateral.id,
          },
          totalSupplied: '0',
          supplyApr: '0',
          isCollateral: true,
        },
      ],
      borrowed: [
        {
          token: { address: pool.asset.id },
          totalBorrowed: pool.totalBorrowBase,
          borrowApr: pool.borrowAPR,
        },
      ],
    };
  }

  protected getUniqueTokensFromRawPools(pools: ISushiLendingFeatureEntryMinimal[]): Address[] {
    const tokens = new Set<string>();
    pools.forEach((pool) => {
      tokens.add(pool.id);
      pool.supplied.forEach((supply) => tokens.add(supply.token.address));
      tokens.add(pool.borrowed[0].token.address);
    });

    return Array.from(tokens);
  }

  protected formatOpportunity(
    pool: ISushiLendingFeatureEntryMinimal,
    tokens: TokenMap,
  ): void | ISushiLendingFeatureOpportunity {
    const suppliedOpportunity = pool.supplied;
    const borrowedOpportunity = pool.borrowed;

    const suppliedToken = tokens.get(suppliedOpportunity[0].token.address.toLowerCase());
    const borrowedToken = tokens.get(borrowedOpportunity[0].token.address.toLowerCase());
    const collateralToken = tokens.get(suppliedOpportunity[1].token.address.toLowerCase());

    if (!suppliedToken || !borrowedToken || !collateralToken) {
      throw new Error(
        `Token missing for lending pool: ${pool.id}, protocol: SushiV2/${this.meta.chain}`,
      );
    }

    const apy = aprToApy(normalizeDecimals(suppliedOpportunity[0].supplyApr, 18));
    const borrowApy = aprToApy(
      normalizeDecimals(borrowedOpportunity[0].borrowApr, borrowedToken.decimals),
    );

    const totalBorrowed = normalizeDecimals(
      borrowedOpportunity[0].totalBorrowed,
      borrowedToken.decimals,
    );

    const totalSupplied = normalizeDecimals(
      new BigNumber(suppliedOpportunity[0].totalSupplied).minus(
        borrowedOpportunity[0].totalBorrowed,
      ),
      suppliedToken.decimals,
    );

    const tvl =
      normalizeDecimals(suppliedOpportunity[0].totalSupplied, suppliedToken.decimals) *
      suppliedToken.price;
    const borrowTvl = totalBorrowed * borrowedToken.price;

    return {
      feature: pool.feature,
      id: pool.id,
      chain: pool.chain,
      borrowed: [
        {
          token: borrowedToken,
          tvl: borrowTvl,
          apy: { year: borrowApy },
          totalBorrowed,
        },
      ],
      supplied: [
        {
          token: suppliedToken,
          totalSupplied,
          tvl,
          apy: { year: apy },
          isCollateral: false,
        },
        {
          token: collateralToken,
          totalSupplied: 0,
          tvl: 0,
          apy: { year: 0 },
          isCollateral: true,
        },
      ],
    };
  }

  async getLendingPositions(addresses: Address[]): Promise<ISushiSwapBentoBoxUsers[]> {
    const response$ = this.httpService.post(this.meta.subgraphUrl, {
      variables: { addresses },
      query: getLendingPositionsQuery,
    });

    const response = await firstValueFrom(response$);

    if (response.data.errors) {
      this.logger.error(response.data.errors);
      return [];
    }

    return response.data.data.users;
  }

  async getUsersData(
    addresses: string[],
  ): Promise<IUserDataProtocolResponse<ISushiLendingFeatureUserEntry>> {
    const { data: pools, errors } = await this.getPoolData();

    const results = new Map<Address, ISushiLendingFeatureUserEntry[]>(
      addresses.map((address) => [address, [] as ISushiLendingFeatureUserEntry[]]),
    );

    try {
      const usersData = await this.getLendingPositions(addresses);

      addresses.forEach((address, index) => {
        const userData = usersData[index];
        const supplyTokens: ISupplyTokenUserEntry[] = [];
        const borrowTokens: IBorrowTokenUserEntity[] = [];
        userData?.kashiPairs.forEach((kashi) => {
          const userPool = cloneDeep(pools.find((pool) => pool.id === kashi.pair.id));
          const [supply, collateral] = userPool.supplied;
          if (Number(kashi.assetFraction) > 0) {
            supplyTokens.push(this.formatLendingUserData(supply, kashi.assetFraction));
          }

          let borrowItem: ISushiBorrowTokenUserEntity;
          if (Number(kashi.borrowPart) > 0) {
            borrowItem = this.formatLendingUserData(userPool.borrowed[0], kashi.borrowPart);
          }

          if (Number(kashi.collateralShare) > 0) {
            const formattedCollateral: ISushiSupplyTokenUserEntry = this.formatLendingUserData(
              collateral,
              kashi.collateralShare,
            );
            formattedCollateral.isCollateral = true;
            supplyTokens.push(formattedCollateral);

            if (borrowItem) {
              borrowItem.healthFactor = (formattedCollateral.value * 0.75) / borrowItem.value;
              borrowTokens.push(borrowItem);
            }
          }
        });

        results.get(address).push({
          feature: FeatureEnum.lending,
          id: 'SushiSwap-lending',
          chain: this.meta.chain,
          borrowed: borrowTokens,
          supplied: supplyTokens,
          debtRatio: 0,
        });
      });
    } catch (e) {
      errors.push(e);
    }
    return { data: results, errors };
  }

  formatLendingUserData(
    pool: ISushiBorrowTokenOpportunity | ISushiSupplyTokenOpportunity,
    balance: string,
  ) {
    const userBalance = normalizeDecimals(balance, pool.token.decimals);

    const apy = pool.apy.year || 0;

    const breakdown = {
      day: apy / 365,
      week: apy / 52,
      month: apy / 12,
      year: apy,
    };

    return Object.assign({}, pool, {
      amount: userBalance,
      value: userBalance * pool.token.price,
      apr: breakdown,
      apy: breakdown,
    });
  }
}

export interface SubgraphOpportunityMinimal {
  asset: {
    id: string;
  };
  collateral: {
    id: string;
  };
  supplyAPR: string;
  totalAssetBase: string;
  totalAssetElastic: string;
  totalBorrowBase: string;
  totalBorrowElastic: string;
  totalCollateralShare: string;
  type: string;
  utilization: string;
  borrowAPR: string;
  exchangeRate: string;
  id;
}
