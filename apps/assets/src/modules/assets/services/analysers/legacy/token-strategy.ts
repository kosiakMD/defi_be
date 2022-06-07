import { AssetEntity } from '../../../entities/asset.entity';

export interface UnderlyingTokenStrategy {
  attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<string[]>;
}
