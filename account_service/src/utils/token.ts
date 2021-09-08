import { ETH_ADDRESS, ETH_BNB_ADDRESS } from 'src/common/constatnt';
import { ChainIdEnum } from 'src/common/enum';
import { Address } from 'src/common/interfaces';
import { ChainId } from 'src/common/types';

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
