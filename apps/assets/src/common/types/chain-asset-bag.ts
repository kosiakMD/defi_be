import { AssetEntity } from '../../modules/assets/entities/asset.entity';
import { AssetReference } from './asset-reference';

export class ChainAssetBag {
  private readonly pricesMap = new Map<string, number>();
  private readonly assetsMap = new Map<string, AssetEntity>();

  hasAsset(asset: AssetReference): boolean {
    return !!this.getAsset(asset);
  }

  setAsset(asset: AssetEntity) {
    return this.assetsMap.set(this.getKey(asset), asset);
  }

  setAssets(assets: AssetEntity[]) {
    assets.forEach((asset) => {
      this.setAsset(asset);
    });
  }

  getAsset(asset: AssetReference): AssetEntity {
    return this.assetsMap.get(this.getKey(asset));
  }

  removeAsset(asset: AssetReference) {
    this.assetsMap.delete(this.getKey(asset));
  }

  hasPrice(asset: AssetReference): boolean {
    return this.getPrice(asset) > 0;
  }

  setPrice(asset: AssetReference, price: number) {
    return this.pricesMap.set(this.getKey(asset), price);
  }

  getPrice(asset: AssetReference): number {
    return this.pricesMap.get(this.getKey(asset));
  }

  removePrice(asset: AssetReference) {
    this.pricesMap.delete(this.getKey(asset));
  }

  private getKey({ chainId, address }: AssetReference): string {
    return `${chainId}_${address}`;
  }
}
