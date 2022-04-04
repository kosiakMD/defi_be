import { ERC20 } from '../../../contracts/ERC20';
import { MetadataStrategy } from './index';

export class EVMMetaDataStrategy extends MetadataStrategy {
  public async getMetadata(address, chainId, instance) {
    const assetContract = new ERC20(address, instance);
    return await assetContract.getContractData();
  }
}
