import { MetadataStrategy } from './index';

export class CardanoMetadataStrategy extends MetadataStrategy {
  async getMetadata(address, chain, instance): Promise<any> {
    const asset = await instance.assetsById(address);
    if (asset?.metadata) {
      return {
        symbol: asset.metadata.ticker,
        name: asset.metadata.name,
        decimals: asset.metadata.decimals ?? 1,
      };
    }
  }
}
