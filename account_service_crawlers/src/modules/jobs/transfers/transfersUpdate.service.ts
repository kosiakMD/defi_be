import { Injectable, LoggerService, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';
import { getManager } from 'typeorm';

import { TokenPriceRequest } from '../../../models/dto/priceBatch.request.dto';
import { PriceServiceResponse } from '../../../models/interfaces/priceServiceResponse.interface';
import getUnPricedTokens from '../../../models/queries/GET_UPRICED_TRANSACTIONS';
import updateTransferNativeCoinPrices from '../../../models/queries/UPDATE_TRANSFERS_NATIVE_COIN_PRICES';
import updateTransferUsdPrices from '../../../models/queries/UPDATE_TRANSFER_USD_PRICES';

export type TokenAddresses = { [key: string]: number };

@Injectable()
export class TransfersUpdateService {
  protected readonly getPricesUrl: string;
  protected readonly mainCoinAddress: string;
  protected readonly chainId: number;
  protected readonly currencyId: number;
  protected readonly transfersLimitQuery: string;
  protected readonly unpricedTokens: string;
  protected readonly transferTable: string;
  protected readonly updateUsdPrices: string;
  protected readonly nativeAssetColumn: string;
  protected readonly startCrawlDate: number;

  constructor(
    protected readonly logger: LoggerService,
    protected httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}/batch`;
  }

  private async getTokenPrices(assets: Array<TokenPriceRequest>): Promise<PriceServiceResponse> {
    return this.httpService
      .post(this.getPricesUrl, {
        currencyId: 1,
        chainId: this.chainId,
        assets: assets,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }

  public async updatePrices(entityManager): Promise<void> {
    try {
      const start1 = new Date().getTime();
      this.logger.log((new Date().getTime() - start1) / 1000, 'Query: getUnPricedTokens');
      const unpricedTransfers = await entityManager.query(
        getUnPricedTokens(this.transferTable, this.nativeAssetColumn, this.startCrawlDate),
      );
      if (!unpricedTransfers.length) {
        return;
      }

      const assets = [];
      const timestamps: number[] = [];

      for (const transfer of unpricedTransfers) {
        if (!timestamps.includes(Number(transfer['blocktimestamp']))) {
          timestamps.push(Number(transfer['blocktimestamp']));
        }
        const transferInArray = await assets.find(
          (unpricedContract) => unpricedContract.address === transfer['tokenaddress'],
        );
        if (transferInArray) {
          transferInArray.timestamps.push(Number(transfer['tokenaddress']));
        } else {
          assets.push({
            address: transfer['tokenaddress'],
            timestamps: [Number(transfer['blocktimestamp'])],
          });
        }
      }
      const start2 = new Date().getTime();
      const [tokenPrices, nativeAssetPrice] = await Promise.all([
        this.getTokenPrices(assets),
        this.getTokenPrices([{ address: this.mainCoinAddress, timestamps: timestamps }]),
      ]);
      this.logger.log(
        (new Date().getTime() - start2) / 1000,
        'Get: tokenPrices & nativeAssetPrice',
      );

      this.logger.log(new Date().toLocaleTimeString(), 'tokenPrices.find & nativeAssetPrice.find');
      const usdPrices = [];
      const nativeAssetPrices = [];

      const start3 = new Date().getTime();
      for (const token of Object.keys(tokenPrices.prices)) {
        if (tokenPrices.prices[token] !== null) {
          const txTimestamp = await unpricedTransfers.find(
            (upricedTx) => upricedTx.tokenaddress === token,
          );
          const tokenPrice = tokenPrices.prices[token][txTimestamp.blocktimestamp];
          const nativeAssetPriceTimestamp =
            nativeAssetPrice.prices[this.mainCoinAddress][txTimestamp.blocktimestamp];
          if (tokenPrice) {
            usdPrices.push(`('${token}', ${tokenPrice}, ${txTimestamp.blocktimestamp})`);
          }
          if (nativeAssetPriceTimestamp) {
            nativeAssetPrices.push(
              `('${token}', ${nativeAssetPriceTimestamp}, ${txTimestamp.blocktimestamp})`,
            );
          }
        }
      }
      this.logger.log(
        (new Date().getTime() - start3) / 1000,
        `Query find: usdPrices of ${usdPrices.length} & nativeAssetPrices of ${nativeAssetPrices.length}`,
      );

      this.logger.log(`${new Date()}: Eth token price job - update token prices in DB`);

      const start4 = new Date().getTime();

      const updateQueries = [];
      if (usdPrices.length) {
        updateQueries.push(
          entityManager.query(updateTransferUsdPrices(this.transferTable, usdPrices)),
        );
      }
      if (nativeAssetPrices.length) {
        updateQueries.push(
          entityManager.query(
            updateTransferNativeCoinPrices(
              this.transferTable,
              this.nativeAssetColumn,
              nativeAssetPrices,
            ),
          ),
        );
      }

      await Promise.all(updateQueries);
      this.logger.log(
        (new Date().getTime() - start4) / 1000,
        'Query: updateTransferUsdPrices & updateTransferNativeCoinPrices',
      );
      return;
    } catch (e) {
      this.logger.error(e, 'Token price update error');
    }
  }

  public async updateTransferPrices(): Promise<void> {
    const entityManager = getManager();
    return this.updatePrices(entityManager);
  }
}
