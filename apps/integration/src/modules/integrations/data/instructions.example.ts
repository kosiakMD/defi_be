export const instructionsExample = {
  instructions: {
    context: {
      chainCode: 18,
      lpTokenAddress: '0x5eeC60F348cB1D661E4A5122CF4638c7DB7A886e',
    },
    chainCalls: [
      {
        address: '0x5eeC60F348cB1D661E4A5122CF4638c7DB7A886e', //one of LP from MCV1 trisolaris protocol
        abi: {
          constant: true,
          inputs: [],
          name: 'totalSupply',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      },
      {
        address: '0x5eeC60F348cB1D661E4A5122CF4638c7DB7A886e', //one of LP from MCV1 trisolaris protocol
        abi: {
          constant: true,
          inputs: [],
          name: 'getReserves',
          outputs: [
            {
              internalType: 'uint112',
              name: '_reserve0',
              type: 'uint112',
            },
            {
              internalType: 'uint112',
              name: '_reserve1',
              type: 'uint112',
            },
            {
              internalType: 'uint32',
              name: '_blockTimestampLast',
              type: 'uint32',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      },
    ],
    fieldsMapping: {
      totalSupply: 'chainCalls.0.output.data',
      getReserves: 'chainCalls.1.output.data',
    },
  },
};
