import { Injectable } from '@nestjs/common';

import { AssetGetDto } from './dto/AssetGet.dto';

@Injectable()
export class AssetsService {
  constructor() {}
  async getAsset(asset: AssetGetDto): Promise<void> {
    // TODO implementation comming soon
    JSON.stringify(asset);
  }
  async getBulkAssets(assets: AssetGetDto[]): Promise<void> {
    await Promise.all(assets.map((asset) => this.getAsset(asset)));
  }
}
