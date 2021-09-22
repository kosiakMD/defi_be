import BigNumber, { BigNumber as BN } from 'bignumber.js';

import { UniswapSubgraph } from '../thegraph/uniswap.subgraph';

type Decimals = string | number;
export type Chain = number;

export const CHAIN_ID_ETH: Chain = 1;

export const decimalsDivider = (decimals: Decimals): BigNumber => new BN(10).pow(decimals);

export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

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
  subgraph: UniswapSubgraph = null,
): Promise<{
  userAddresses: string[];
  response: {
    uniswapLiquidityPositions: Map<any, any>;
    sushiswapStakingPosition: Map<any, any>;
  };
}> {
  const addressesArray = getUniqueAndToLowerCaseArrayData(addresses);
  const flag = subgraph && subgraph.constructor.name === 'SushiswapSubgraph';
  const [liquidityPosition, stakingPositions] = await Promise.all([
    subgraph.getLiquidityPositions(addressesArray),
    flag ? subgraph.getStakingPositions(addressesArray) : null,
  ]);

  const uniswapLiquidityPositions = groupBy(
    liquidityPosition.data.liquidityPositions,
    (liquidityPosition) => liquidityPosition.user.id,
  );

  const sushiswapStakingPosition = flag
    ? groupBy(stakingPositions.data.users, (staking) => {
        const array = staking.id.split('-');
        return array[1];
      })
    : null;

  return {
    userAddresses: addressesArray,
    response: {
      uniswapLiquidityPositions,
      sushiswapStakingPosition,
    },
  };
}
