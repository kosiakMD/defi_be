import { Repository } from 'typeorm';

import { UniswapSubgraph } from '../thegraph/uniswap.subgraph';

export function groupBy(list, keyGetter): Map<any, any> {
  const map = new Map();
  list.forEach((item) => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
}

export async function getDataByAddresses<T, K, V, E>(
  repository1: Repository<T>,
  repository2: Repository<K>,
  repository3: Repository<V>,
  repository4: Repository<E>,
  addresses: string,
  subgraph: UniswapSubgraph,
) {
  const addressesArray = addresses.split(',');

  const [swapFrom, mint, burn, snapshot, liquidityPosition] = await Promise.all([
    repository1
      .createQueryBuilder()
      .where(`from_address IN (:...fields)`, { fields: addressesArray })
      .orderBy('block_number', 'DESC')
      .limit(2000)
      .getMany(),
    repository2
      .createQueryBuilder()
      .where(`to_address IN (:...fields)`, { fields: addressesArray })
      .orderBy('block_number', 'DESC')
      .limit(2000)
      .getMany(),
    repository3
      .createQueryBuilder()
      .where(`to_address IN (:...fields)`, { fields: addressesArray })
      .orderBy('block_number', 'DESC')
      .limit(2000)
      .getMany(),
    repository4
      .createQueryBuilder()
      .where(`user_address IN (:...fields)`, { fields: addressesArray })
      .getMany(),
    subgraph.getUniswapLiquidityPositions(addressesArray),
  ]);

  const uniswapSnapshots = groupBy(snapshot, (uniswapSnapshot) => uniswapSnapshot.userAddress);
  const uniswapSwapsFrom = groupBy(swapFrom, (swap) => swap.fromAddress);
  const uniswapMints = groupBy(mint, (uniswapMint) => uniswapMint.toAddress);
  const uniswapBurns = groupBy(burn, (uniswapBurn) => uniswapBurn.toAddress);
  const uniswapLiquidityPositions = groupBy(
    liquidityPosition.data.liquidityPositions,
    (liquidityPosition) => liquidityPosition.user.id,
  );

  return {
    userAddresses: addressesArray,
    response: {
      uniswapSwapsFrom,
      uniswapMints,
      uniswapBurns,
      uniswapSnapshots,
      uniswapLiquidityPositions,
    },
  };
}
