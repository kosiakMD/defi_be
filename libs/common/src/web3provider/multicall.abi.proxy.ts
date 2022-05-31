import { plainToClass } from 'class-transformer';

import { Address } from '@app/common';

import { CallData } from '../dto/CallData';

/**
 * This Helper/Extension adds functionality to static abi classes.
 * Instead of creating a new CallData to be passed to the multicall
 * this allows you to instantiate the 'abi' and call the functions
 * directly...
 *
 * e.g.
 * class MyErc20Abi extends BaseMultiCallProxy {
 *   static readonly exchangeRateStored: AbiItem = {
 *     constant: true,
 *     inputs: [],
 *     name: 'balanceOf',
 *     outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
 *     payable: false,
 *     stateMutability: 'view',
 *     type: 'function',
 *   };
 * }
 *
 * const token = new MyErc20Abi('0xabcd123')
 *
 * // Pass [call] to multicall to get the results
 * const call = token.balanceOf();
 */
export abstract class MultiCallAbiProxy {
  [key: string]: any;
  constructor(address: Address) {
    return new Proxy(
      {},
      {
        get: (target, propKey: string) => {
          // instance.address returns current in use address
          if (propKey === 'address') return address;

          // Convert each call to CallData
          return (...args: any) => {
            const abi = this.constructor[propKey];

            if (!abi)
              throw new Error(
                `Missing ABI for call: ${this.constructor.name}.${propKey} (${address})`,
              );
            return plainToClass(CallData, {
              address,
              abi,
              input: { data: args },
            });
          };
        },
      },
    );
  }
}
