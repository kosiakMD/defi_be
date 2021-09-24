import { ETH_ADDRESS, ETH_BNB_ADDRESS } from '@app/common/constant';
import { ChainIdEnum } from '@app/common/enum';
import { Address } from '@app/common/types';
import { ChainId } from '@app/common/types';

function handleEthereum(address: Address): Address {
  return address.match(/e{40}$/g) ? ETH_ADDRESS : address;
}

function handleBsc(address: Address): Address {
  return address === ETH_BNB_ADDRESS ? ETH_ADDRESS : address;
}

export function replaceIncorrectTokenAddress(address: Address, chainId: ChainId): Address {
  switch (chainId) {
    case ChainIdEnum.eth:
      return handleEthereum(address);

    case ChainIdEnum.bsc:
      return handleBsc(address);

    default:
      return address;
  }
}
