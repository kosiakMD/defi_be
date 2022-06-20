import { AssembledAssetInterface } from '@sdk/assets/interfaces';
import { BigNumber as BN } from 'bignumber.js';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { Address } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { equals, normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { RpcService } from '../../../../../modules/microservices/rpc.service';
import {
  INamedFunctionPredicates,
  IWalletMinimal,
  IWalletOpportunity,
  IWalletUserEntry,
} from '../../../interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { ISupplyTokenOpportunity } from '../../../interfaces/tokens.supplied.interface';
import { MultiContractProtocol } from '../../MultiContractProtocol';
import {
  ILiquidityPositionResponse,
  ILiquidityPositionVariables,
  IPool,
  IPoolsResponse,
  LIQUIDITY_POSITION,
  POOLS,
} from '../../Subgraphs/OccamXSubgraph';
import { IGetReservesData, IOccamXPoolsResponse, IOccamXProtocolMeta } from './occamx.interfaces';

@Injectable()
export abstract class OccamXBase<
  B extends IWalletMinimal,
  R extends IWalletOpportunity,
  U extends IWalletUserEntry,
  H extends IOccamXProtocolMeta,
> extends MultiContractProtocol<B, R, U, H> {
  protected abstract httpService: HttpService;
  protected abstract rpcService: RpcService;
  protected abstract multicall: MulticallAggregator;

  protected functionPredicates: INamedFunctionPredicates = {
    getReserves: () => (item) => equals(item.name, 'getReserves'),
  };

  protected callLabel(address: Address, genericName: string) {
    return `${address}.${genericName}()`;
  }

  protected async getTokensForOpportunities(opportunities: B[]): Promise<Map<Address, ERC20Token>> {
    const inputlessFunctions = Object.values(this.functions).filter((item) => !item.inputs?.length);
    const calls = new Map();

    opportunities.forEach((pool) => {
      const contract = new DynamicContract(pool.id);

      inputlessFunctions.forEach((item) => {
        calls.set(this.callLabel(pool.id, item.name), contract.createCall(item));
      });
    });

    const results = await this.multicall.handleInBatches<IGetReservesData>(calls, this.meta.chain);

    const tokensAddresses = this.getUniqueTokensFromRawPools(opportunities);
    const assets = new Map(
      await this.assetService.getAssets(
        tokensAddresses.map((address) => ({
          address,
          chainId: this.meta.chain,
        })),
      ),
    );

    const tokens: [Address, ERC20Token][] = this.toOpportunitiesTokens(
      opportunities,
      results,
      assets,
    ).reduce((suppliedTokens, pool) => {
      pool.supplied.map((supply: ISupplyTokenOpportunity) =>
        suppliedTokens.push([supply.token.address, supply.token]),
      );
      return suppliedTokens;
    }, []);

    return new Map(tokens);
  }

  fetchUserLiquidityPosition(variables: ILiquidityPositionVariables) {
    return firstValueFrom(
      this.httpService
        .post<ILiquidityPositionResponse>(this.meta.context.endpoint.subgraph, {
          query: LIQUIDITY_POSITION,
          variables,
        })
        .pipe(map((response) => response.data.data.getLiquidityMiningPanel)),
    );
  }

  fetchAllPools() {
    return firstValueFrom(
      this.httpService
        .get(this.meta.context.endpoint.allPools)
        .pipe(map(({ data }: { data: IOccamXPoolsResponse }) => data.pools)),
    );
  }

  fetchUserPools(account: Address) {
    return firstValueFrom(
      this.httpService
        .post<IPoolsResponse>(this.meta.context.endpoint.subgraph, {
          query: POOLS,
          variables: { account },
        })
        .pipe(map((response) => response.data.data.getLiquidityMiningList.list)),
    );
  }

  toOpportunitiesTokens(
    opportunities: B[],
    mappedReserves: Map<string, CallData<IGetReservesData>>,
    assets: Map<string, AssembledAssetInterface>,
  ): B[] {
    return opportunities.map((pool) => {
      const reserves = this.getReserves(
        mappedReserves.get(this.callLabel(pool.id, this.functions.getReserves.name)).output.data,
      );

      return {
        ...pool,
        supplied: pool.supplied.map((token, position) => {
          const asset = assets.get(token.token.address);
          const reserve = normalizeDecimals(
            new BN(reserves[position]).toString(),
            asset?.decimals ?? 18,
          );
          const price = new BN(pool.meta.tvl) //
            .div(2)
            .div(reserve)
            .toNumber();

          return {
            token: {
              ...asset,
              reserve,
              price,
            },
            tvl: new BN(reserve) //
              .multipliedBy(price)
              .toNumber(),
          };
        }),
      };
    });
  }

  toUserLPSubgraphVariables(address: Address, pool: IPool): ILiquidityPositionVariables {
    return {
      account: address,
      address: pool.address.toLocaleLowerCase(),
      contract: pool.contract,
    };
  }

  getReserves(reserves: IGetReservesData): [number, number] {
    // eslint-disable-next-line no-underscore-dangle
    return [new BN(reserves._reserve0).toNumber(), new BN(reserves._reserve1).toNumber()];
  }
}
