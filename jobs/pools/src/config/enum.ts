export enum ChainIdEnum {
  eth = 1,
  bsc = 2,
  polygon = 3,
  ftm = 4,
}

export const pancakeAbiItems = {
  getReserves: {
    constant: true,
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: '_reserve0', type: 'uint112' },
      { internalType: 'uint112', name: '_reserve1', type: 'uint112' },
      { internalType: 'uint32', name: '_blockTimestampLast', type: 'uint32' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  balanceOf: {
    constant: true,
    inputs: [],
    name: 'balanceOf',
    outputs: [
      { internalType: 'uint112', name: '_reserve0', type: 'uint112' },
      { internalType: 'uint112', name: '_reserve1', type: 'uint112' },
      { internalType: 'uint32', name: '_blockTimestampLast', type: 'uint32' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
};

export enum CurrencyIdEnum {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  usd = 1,
}
