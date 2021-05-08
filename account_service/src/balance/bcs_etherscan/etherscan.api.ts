import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../../../../api_gateway/src/common/Logger/Logger.service';
import { EtherscanTransfer } from '../../../../api_gateway/src/transfers/transfers.interfaces';

const TRANSFERS_CACHE_TIME = 30; // 30 sec

@Injectable()
export class EtherscanApi {
  private readonly bscUrl: string;
  private bscApiKey: string;
  private readonly ethUrl: string;
  private ethApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.bscUrl = this.configService.get<string>('BSCSCAN_URL');
    this.bscApiKey = this.configService.get<string>('BSCSCAN_KEY');
    this.ethUrl = this.configService.get<string>('ETHERSCAN_URL');
    this.ethApiKey = this.configService.get<string>('ETHERSCAN_KEY');
  }

  async getEthTransfers(address: string, chain: number): Promise<any> {
    const url = Number(chain) === 1 ? this.ethUrl : this.bscUrl;
    const action = 'tokentx';
    const chainPrefix = chain === 1 ? 'eth' : 'bsc';

    const cacheKey = `${chainPrefix}_transfers_${action}_${address}`;
    const logString = `Cache ${cacheKey} is `;

    let transfers = await this.cacheManager.get<EtherscanTransfer[]>(cacheKey);

    if (!transfers || !Array.isArray(transfers)) {
      try {
        this.logger.debug(logString + 'fetching');
        const transfersResp = await this.httpService
          .get(url, {
            params: {
              module: 'account',
              action: action,
              address: address,
              apikey: Number(chain) === 1 ? this.ethApiKey : this.bscApiKey,
            },
          })
          .pipe(map((response) => response.data))
          .toPromise();

        transfers = transfersResp && transfersResp.result ? transfersResp.result : [];
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (async () => {
          await this.cacheManager.set<EtherscanTransfer[]>(cacheKey, transfers, {
            ttl: TRANSFERS_CACHE_TIME,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e) {
        // if no data and request failed - m.b. data was wrote by another process
        transfers = await this.cacheManager.get<EtherscanTransfer[]>(cacheKey);
        if (!transfers || !Array.isArray(transfers)) {
          throw e;
        }
      }
    } else {
      this.logger.debug(logString + 'ok');
    }
    return transfers;
  }
}
