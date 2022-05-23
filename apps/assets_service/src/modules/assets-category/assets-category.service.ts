import { firstValueFrom, lastValueFrom, map } from 'rxjs';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CrudService } from '@app/common/services/crud.service';

import { Chain } from '../../common/types/chain.type';

import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetsService } from '../assets/services/assets.service';
import { AssetCategoryEntity } from './entities/asset-category.entity';

@Injectable()
export class AssetsCategoryService extends CrudService<AssetCategoryEntity> {
  private coinmarketcapPlatformChainIdEnum: { [key: string]: number } = {};

  constructor(
    @InjectRepository(AssetCategoryEntity)
    private readonly assetsCategoryRepository: Repository<AssetCategoryEntity>,
    @InjectRepository(AssetsRepository) private assetsRepository: AssetsRepository,
    private readonly http: HttpService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly config: ConfigService,
    private readonly assetsService: AssetsService,
  ) {
    super(assetsCategoryRepository);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.debug('Started categorization job for stable coins');
    await this.getAllChains();
    await this.categorizeStableCoins();
  }

  public async findAll() {
    return await this.getAll();
  }

  public async findOne(id: number) {
    return await this.get({ id });
  }

  private async categorizeStableCoins() {
    const apiKey = this.config.get('COINMARKETCAP_API_KEY');
    if (!apiKey) {
      this.logger.error('Coinmarketcap API key not provided in assets category service.');
      return;
    }
    const coins = await lastValueFrom(
      this.http
        .get(
          'https://pro-api.coinmarketcap.com/v1/cryptocurrency/category?id=625d04fa57c0560770d004e1',
          {
            headers: { ['X-CMC_PRO_API_KEY']: apiKey },
          },
        )
        .pipe(map(({ data }) => data.data.coins)),
    );

    if (!coins || !coins.length) return;

    const mappedCoins = coins
      .map((c) => ({
        address: c?.platform?.token_address,
        chainId: this.coinmarketcapPlatformChainIdEnum[c?.platform?.name],
      }))
      .filter((c) => c.address && c.chainId);

    const bulkAssets = await this.assetsService.getBulkAssets(mappedCoins);
    const [stableCategory] = await this.assetsCategoryRepository.find({
      where: { code: 'STABLE' },
    });

    for (const asset of bulkAssets) {
      asset.categories = [...asset.categories, stableCategory];
      await this.assetsRepository.save(asset);
    }
  }

  private async getAllChains(): Promise<void> {
    const { data } = await firstValueFrom(
      this.http.get<Chain[]>(this.config.get('ACCOUNT_SERVICE_CHAINS_LIST_URL')),
    );
    data.forEach(({ id, metadata: { coinmarketcapPlatformName } }) => {
      if (coinmarketcapPlatformName) {
        this.coinmarketcapPlatformChainIdEnum[coinmarketcapPlatformName] = id;
      }
    });
  }
}
