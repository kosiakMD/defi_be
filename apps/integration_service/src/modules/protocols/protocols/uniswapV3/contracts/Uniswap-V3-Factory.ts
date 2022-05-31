import { AbiItem } from 'web3-utils';

import { ChainDto, ChainIdEnum } from '@app/common';
import { MulticallAbiProxy } from '@app/common/web3provider/multicall-abi.proxy';

export class UniswapV3Factory extends MulticallAbiProxy {
  constructor(chain: ChainDto) {
    const addresses = {
      [ChainIdEnum.eth]: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
      [ChainIdEnum.arbi]: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
      [ChainIdEnum.opt]: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
      [ChainIdEnum.plg]: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
    };
    super(addresses[chain.id]);
  }

  static readonly getPool: AbiItem = {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint24', name: '', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
