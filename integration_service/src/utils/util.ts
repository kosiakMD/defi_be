import { Repository } from 'typeorm';
import BigNumber, { BigNumber as BN } from 'bignumber.js';
import { UniswapLiquidityPosition } from '../interfaces/liquidity.position.interfaces';
import { UniswapSubgraph } from '../thegraph/uniswap.subgraph';

type Decimals = string | number;

export const decimalsDivider = (decimals: Decimals): BigNumber => new BN(10).pow(decimals);

export const abi = [
  {
    inputs: [
      { internalType: 'contract SushiToken', name: '_sushi', type: 'address' },
      { internalType: 'address', name: '_devaddr', type: 'address' },
      { internalType: 'uint256', name: '_sushiPerBlock', type: 'uint256' },
      { internalType: 'uint256', name: '_startBlock', type: 'uint256' },
      { internalType: 'uint256', name: '_bonusEndBlock', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'pid', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Deposit',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'pid', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'EmergencyWithdraw',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'newOwner', type: 'address' },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'pid', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Withdraw',
    type: 'event',
  },
  {
    inputs: [],
    name: 'BONUS_MULTIPLIER',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_allocPoint', type: 'uint256' },
      { internalType: 'contract IERC20', name: '_lpToken', type: 'address' },
      { internalType: 'bool', name: '_withUpdate', type: 'bool' },
    ],
    name: 'add',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'bonusEndBlock',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_devaddr', type: 'address' }],
    name: 'dev',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'devaddr',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_pid', type: 'uint256' }],
    name: 'emergencyWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_from', type: 'uint256' },
      { internalType: 'uint256', name: '_to', type: 'uint256' },
    ],
    name: 'getMultiplier',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'massUpdatePools',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_pid', type: 'uint256' }],
    name: 'migrate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'migrator',
    outputs: [{ internalType: 'contract IMigratorChef', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingSushi',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accSushiPerShare', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'uint256', name: '_allocPoint', type: 'uint256' },
      { internalType: 'bool', name: '_withUpdate', type: 'bool' },
    ],
    name: 'set',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'contract IMigratorChef', name: '_migrator', type: 'address' }],
    name: 'setMigrator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'startBlock',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'sushi',
    outputs: [{ internalType: 'contract SushiToken', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'sushiPerBlock',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalAllocPoint',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_pid', type: 'uint256' }],
    name: 'updatePool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

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

// will be changed
export async function getDbDataByAddresses<T, K, V, E>(
  repository1: Repository<T>,
  repository2: Repository<K>,
  repository3: Repository<V>,
  repository4: Repository<E>,
  addresses: string[],
) {
  const addressesArray = getUniqueAndToLowerCaseArrayData(addresses);
  const [swapFrom, mint, burn, snapshot] = await Promise.all([
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
  ]);

  const uniswapSnapshots = groupBy(snapshot, (uniswapSnapshot) => uniswapSnapshot.userAddress);
  const uniswapSwapsFrom = groupBy(swapFrom, (swap) => swap.fromAddress);
  const uniswapMints = groupBy(mint, (uniswapMint) => uniswapMint.toAddress);
  const uniswapBurns = groupBy(burn, (uniswapBurn) => uniswapBurn.toAddress);

  return {
    userAddresses: addressesArray,
    response: {
      uniswapSwapsFrom,
      uniswapMints,
      uniswapBurns,
      uniswapSnapshots,
      uniswapLiquidityPositions: new Map<string, UniswapLiquidityPosition[]>(),
      sushiswapStakingPosition: new Map<string, any>(),
    },
  };
}

export async function getDataByAddresses<T, K, V, E>(
  repository1: Repository<T>,
  repository2: Repository<K>,
  repository3: Repository<V>,
  repository4: Repository<E>,
  addresses: string[],
  subgraph: UniswapSubgraph = null,
) {
  const addressesArray = getUniqueAndToLowerCaseArrayData(addresses);
  const flag = subgraph && subgraph.constructor.name === 'SushiswapSubgraph';
  const [swapFrom, mint, burn, snapshot, liquidityPosition, stakingPositions] = await Promise.all([
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
    flag ? subgraph.getStakingPositions(addressesArray) : null,
  ]);

  const uniswapSnapshots = groupBy(snapshot, (uniswapSnapshot) => uniswapSnapshot.userAddress);
  const uniswapSwapsFrom = groupBy(swapFrom, (swap) => swap.fromAddress);
  const uniswapMints = groupBy(mint, (uniswapMint) => uniswapMint.toAddress);
  const uniswapBurns = groupBy(burn, (uniswapBurn) => uniswapBurn.toAddress);
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
      uniswapSwapsFrom,
      uniswapMints,
      uniswapBurns,
      uniswapSnapshots,
      uniswapLiquidityPositions,
      sushiswapStakingPosition,
    },
  };
}
