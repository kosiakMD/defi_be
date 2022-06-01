import { AssetIcon, AssetReference } from '../types';

export abstract class IconStrategy<TConfig = any> {
  public abstract loadIcons(
    asset: AssetReference,
    config: TConfig,
  ): Promise<AssetIcon[]> | AssetIcon[];
}
