import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In } from 'typeorm';

import { UniswapSubgraph } from '../thegraph/uniswap.subgraph';
import { UniswapBurnsEntity } from './entities/uniswap.burns.entity';
import { UniswapMintsEntity } from './entities/uniswap.mints.entity';
import { UniswapSnapshotsEntity } from './entities/uniswap.snapshots.entity';
import { UniswapSwapsEntity } from './entities/uniswap.swaps.entity';
import { UniswapMapper } from './mappers/uniswap.mapper';
import { UniswapBurnsRepository } from './repository/uniswap.burns.repository';
import { UniswapMintsRepository } from './repository/uniswap.mints.repository';
import { UniswapSnapshotsRepository } from './repository/uniswap.snapshots.repository';
import { UniswapSwapsRepository } from './repository/uniswap.swaps.repository';
import { Base } from './uniswap.interfaces';
import { groupBy } from '../util/util';

@Injectable()
export class UniswapService {
	constructor(
		@InjectRepository(UniswapSwapsEntity) private readonly swapsRepository: UniswapSwapsRepository,
		@InjectRepository(UniswapMintsEntity) private readonly mintsRepository: UniswapMintsRepository,
		@InjectRepository(UniswapBurnsEntity) private readonly burnRepository: UniswapBurnsRepository,
		@InjectRepository(UniswapSnapshotsEntity)
		private readonly snapshotsRepository: UniswapSnapshotsRepository,
		private readonly mapper: UniswapMapper,
		private readonly uniswapSubgraph: UniswapSubgraph,
	) {
	}

	async getDataByAddress(addresses: string): Promise<Base[]> {
		const addressesArray = addresses.split(',');

		const [swapFrom, mint, burn, snapshot, liquidityPosition] = await Promise.all([
			this.swapsRepository.find({ fromAddress: In(addressesArray) }),
			this.mintsRepository.find({ toAddress: In(addressesArray) }),
			this.burnRepository.find({ toAddress: In(addressesArray) }),
			this.snapshotsRepository.find({ userAddress: In(addressesArray) }),
			this.uniswapSubgraph.getUniswapLiquidityPositions(addressesArray),
		]);

		const uniswapSnapshots = groupBy(
			snapshot,
			(uniswapSnapshot) => uniswapSnapshot.userAddress,
		);
		const uniswapSwapsFrom = groupBy(swapFrom, (swap) => swap.fromAddress);
		const uniswapMints = groupBy(mint, (uniswapMint) => uniswapMint.toAddress);
		const uniswapBurns = groupBy(burn, (uniswapBurn) => uniswapBurn.toAddress);
		const uniswapLiquidityPositions = groupBy(
			liquidityPosition.data.liquidityPositions,
			(liquidityPosition) => liquidityPosition.user.id,
		);
		return this.mapper.mapData(addressesArray, {
			uniswapSwapsFrom,
			uniswapMints,
			uniswapBurns,
			uniswapSnapshots,
			uniswapLiquidityPositions,
		});
	}
}
