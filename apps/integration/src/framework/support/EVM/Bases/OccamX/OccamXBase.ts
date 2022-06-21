import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { Address } from '@app/common';
import { equals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { RpcService } from '../../../../../modules/microservices/rpc.service';
import {
  INamedFunctionPredicates,
  IWalletMinimal,
  IWalletOpportunity,
  IWalletUserEntry,
} from '../../../interfaces';
import { MultiContractProtocol } from '../../MultiContractProtocol';
import {
  ILiquidityPositionResponse,
  ILiquidityPositionVariables,
  IPool,
  IPoolsResponse,
  LIQUIDITY_POSITION,
  POOLS,
} from '../../Subgraphs/OccamXSubgraph';
import { IOccamXPoolsResponse, IOccamXProtocolMeta } from './occamx.interfaces';

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

  toUserLPSubgraphVariables(address: Address, pool: IPool): ILiquidityPositionVariables {
    return {
      account: address,
      address: pool.address.toLocaleLowerCase(),
      contract: pool.contract,
    };
  }
}
