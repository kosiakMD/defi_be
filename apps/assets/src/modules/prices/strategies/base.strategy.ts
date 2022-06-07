import { AssetPrice } from '../types/asset-price.type';
import { PriceSource } from '../types/price-source.type';

// TODO: Add more cardano sources
export abstract class BaseStrategy<TConfig = any> {
  public abstract fetchPrices(source: PriceSource<TConfig>): Promise<AssetPrice[]>;
}
