import { ChainAbi } from '../../../interfaces/abi.interfaces';

export interface IAbiFetcher {
  fetchAbiAndAbiCode(address: string): Promise<ChainAbi>;
}
