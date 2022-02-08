import { Injectable } from '@nestjs/common';

import { AssetCreateDto } from './dto/AssetCreate.dto';

@Injectable()
export class AssetsService {
  constructor() {}
  async createAsset(newAsset: AssetCreateDto): Promise<void> {
    // TODO implementation comming soon
    JSON.stringify(newAsset);
  }
  async createBulkAssets(newAssets: AssetCreateDto[]): Promise<void> {
    await Promise.all(newAssets.map((asset) => this.createAsset(asset)));
  }
}
