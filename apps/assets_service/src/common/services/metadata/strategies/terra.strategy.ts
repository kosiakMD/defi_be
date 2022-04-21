import { MetadataStrategy } from './index';

export class TerraMetadataStrategy extends MetadataStrategy {
  async getMetadata(address, chainId, instance?): Promise<any> {
    // eslint-disable-next-line camelcase
    return await instance.wasm.contractQuery(address, { token_info: {} });
  }
}
