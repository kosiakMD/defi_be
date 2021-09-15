import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

import { FACTORY_ABI } from './facrory.abi';

export class FactoryContract {
  private static contract: Contract;

  public static initFactoryContract(web3Provider: Web3, address: string): Contract {
    if (!FactoryContract.contract) {
      FactoryContract.contract = new web3Provider.eth.Contract(FACTORY_ABI as AbiItem[], address);
    }
    return FactoryContract.contract;
  }

  static async getPairInfo(contractAddress1: string, contractAddress2: string): Promise<string> {
    return FactoryContract.contract
      ? await FactoryContract.contract.methods.getPair(contractAddress1, contractAddress2).call()
      : (function () {
          throw Error('FactoryContract is not initialized!');
        })();
  }
}
