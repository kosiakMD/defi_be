import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '@app/common/web3provider/multicall-abi.proxy';

export class CurveProviderAbi extends MulticallAbiProxy {
  static readonly getIdInfo: AbiItem = {
    name: 'get_id_info',
    outputs: [
      { type: 'address', name: 'addr' },
      { type: 'bool', name: 'is_active' },
      { type: 'uint256', name: 'version' },
      { type: 'uint256', name: 'last_modified' },
      { type: 'string', name: 'description' },
    ],
    inputs: [{ type: 'uint256', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
  };
}
