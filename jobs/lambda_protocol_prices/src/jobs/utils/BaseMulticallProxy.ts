import { plainToClass } from 'class-transformer';

import { Address } from '@app/common';

import { CallData } from '../../chain/dto/call.data';

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
export abstract class BaseMultiCallProxy {
  [key: string]: any;
  constructor(address: Address) {
    return new Proxy(
      {},
      {
        get: (target, propKey: string) => {
          // Return the raw class object so each call is accessible (i.e. to get the name of the call)
          // example: MyContractAbi.abi.balanceOf.name
          if (propKey === 'abi') {
            return this.constructor;
          }

          // Convert each call to CallData
          return (...args: any) => {
            return plainToClass(CallData, {
              address,
              abi: this.constructor[propKey],
              input: { data: args },
            });
          };
        },
      },
    );
  }
}
