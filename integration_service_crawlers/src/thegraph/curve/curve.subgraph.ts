import { HttpService, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Pool } from './pool.interface';
import { LiquidityPosition } from './liquidity.position.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CurveSubgraph {
	protected subgraphUrl: string;

	constructor(
		private readonly httpService: HttpService,
		private readonly configService: ConfigService
	) {
		this.subgraphUrl = this.configService.get<string>('AMM_CURVE_SUBGRAPH_URL');
	}

	async getAllPools(): Promise<ResponseData> {
		return this.httpService.post<ResponseData>(this.subgraphUrl, {
			operationName: 'pairs',
			variables: {},
			query: `
        {
					pools (first: 1000) {
						id
						name
						coinCount
						poolTokenSupply
						virtualPrice
						stakingPool
						balances
						poolToken{
							id
							name
							decimals
							symbol
						}
						coins {
							id
							name
							symbol
							decimals
						}
						assignedCoins
        	}
				}`,
		}).pipe(map(response => response.data))
			.toPromise()
	}

	async getLiquidityPositions(usersAddresses: string[]): Promise<LPData> {
		return this.httpService.post<LPData>(this.subgraphUrl, {
			operationName: 'liquidityPositions',
			variables: {
				userAddresses: usersAddresses
			},
			// query can be updated as necessary with no affect to current values
			query: `
        query liquidityPositions($userAddresses: [String]!){
          liquidityPositions (where:{user_in: $userAddresses}) {
            pool {
              id
              poolTokenSupply
            }
            poolTokenBalance
          }
        }`,
		}).pipe(map(response => response.data))
			.toPromise()
	}
}

export interface LPData {
	data: {
		liquidityPositions: LiquidityPosition[]
	}
}

export interface ResponseData {
	data: {
		pools: Pool[]
	}
}
