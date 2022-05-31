import BigNumber from 'bignumber.js';

import { UniswapLikeSubgraph } from '../../modules/subgraphs/subgraphs/uniswap-like-subgraph.service';

export type Chain = number;

export const CHAIN_ID_ETH: Chain = 1;

export function toDecimals(amount, decimals): number {
  if (amount instanceof BigNumber) {
    return Number(amount.times(new BigNumber(10).pow(-Number(decimals))));
  }
  return Number(new BigNumber(amount).times(new BigNumber(10).pow(-Number(decimals))));
}

export function getUniqueAndToLowerCaseArrayData(array: string[]): string[] {
  const temp: string[] = [];
  array.forEach((el) => {
    if (!temp.includes(el.toLowerCase())) {
      temp.push(el.toLowerCase());
    }
  });
  return temp;
}

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

export async function getDataByAddresses(
  addresses: string[],
  subgraph: UniswapLikeSubgraph = null,
): Promise<{
  userAddresses: string[];
  response: {
    subpgrahpPools: Map<any, any>;
    subgraphStaking: Map<any, any>;
  };
}> {
  const addressesArray = getUniqueAndToLowerCaseArrayData(addresses);
  const flag = subgraph && subgraph.constructor.name === 'SushiswapSubgraph';
  const [liquidityPosition, stakingPositions] = await Promise.all([
    subgraph.getLiquidityPositions(addressesArray),
    flag ? subgraph.getStakingPositions(addressesArray) : null,
  ]);

  const subpgrahpPools = groupBy(
    liquidityPosition.data.liquidityPositions,
    (liquidityPosition) => liquidityPosition.user.id,
  );

  const subgraphStaking = flag
    ? groupBy(stakingPositions.data.users, (staking) => {
        const array = staking.id.split('-');
        return array[1];
      })
    : null;

  return {
    userAddresses: addressesArray,
    response: {
      subpgrahpPools,
      subgraphStaking,
    },
  };
}
