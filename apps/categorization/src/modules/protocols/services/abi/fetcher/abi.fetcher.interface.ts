import { ChainAbi } from '../../../interfaces/abi.interfaces';

export interface IAbiFetcher {
  name: string;
  fetchAbiAndAbiCode(address: string): Promise<ChainAbi>;
}
