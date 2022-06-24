import { Address } from '@app/common';

import { AssetEntity } from '../../modules/assets/entities/asset.entity';

export class AssetBag {
  private readonly pricesMap = new Map<Address, number>();
  private readonly assetsMap = new Map<Address, AssetEntity>();

  hasAsset(address: Address): boolean {
    return !!this.getAsset(address);
  }

  setAsset(asset: AssetEntity) {
    return this.assetsMap.set(asset.address, asset);
  }

  setAssets(assets: AssetEntity[]) {
    assets.forEach((asset) => {
      this.setAsset(asset);
    });
  }

  getAsset(address: Address): AssetEntity {
    return this.assetsMap.get(address);
  }

  removeAsset(address: Address) {
    this.assetsMap.delete(address);
  }

  hasPrice(address: Address): boolean {
    return this.getPrice(address) > 0;
  }

  setPrice(address: Address, price: number) {
    return this.pricesMap.set(address, price);
  }

  getPrice(address: Address): number {
    return this.pricesMap.get(address);
  }

  removePrice(address: Address) {
    this.pricesMap.delete(address);
  }
}
