import { CACHE_MANAGER, HttpService, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

const TRANSFERS_CACHE_TIME = 30; // 30 sec

@Injectable()
export class ScanApi {
  private url: string;
  private apiKey: string;
  private readonly chainPrefix: 'bsc'; // | 'eth';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.url = this.configService.get<string>('BSCSCAN_URL');
    this.apiKey = this.configService.get<string>('BSCSCAN_KEY');
  }

  async getTransfers(address: string): Promise<any> {
    const action = 'tokentx';
    // TODO: create function keys generator
    const transfersCacheKey = `${this.chainPrefix}_transfers_${action}_${address}`;
    const logString = `Cache ${action} transfers of: ${address} is `;

    // TODO: if CHAIN will be modified ADD CHAIN_ID to CACHE KEY
    let transfers = await this.cacheManager.get<any[]>(transfersCacheKey);

    if (!transfers) {
      try {
        this.logger.debug(logString + 'fetching');
        const resp = await this.httpService
          .get(this.url, {
            params: {
              module: 'account',
              action: action,
              address: address,
              apikey: this.apiKey,
            },
          })
          .toPromise();
        transfers = resp.data.result;
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (async () => {
          await this.cacheManager.set<any[]>(transfersCacheKey, transfers, {
            ttl: TRANSFERS_CACHE_TIME,
          });
        })().then(() => this.logger.debug(logString + 'saved'));
      } catch (e) {
        // if no data and request failed - m.b. data was wrote by another process
        transfers = await this.cacheManager.get<any[]>(transfersCacheKey);
        if (!transfers) {
          throw e;
        }
      }
    } else {
      this.logger.debug(logString + 'ok');
    }
    return transfers;
  }
}

export interface EtherscanTransfer {
  blockNumber: number;
  timeStamp: number;
  hash: string;
  nonce: number;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  transactionIndex: number;
  gas: number;
  gasPrice: number;
  gasUsed: number;
  cumulativeGasUsed: number;
  input: string;
  confirmations: number;
}
