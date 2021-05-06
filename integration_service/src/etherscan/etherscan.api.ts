import { CACHE_MANAGER, HttpService, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

const TRANSFERS_CACHE_TIME = 30 * 1e3;

@Injectable()
export class EtherscanApi {
  private url: string;
  private apiKey: string;

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
    let transfers = await this.cacheManager.get<any[]>(`transfers_${address}`);
    if (!transfers) {
      this.logger.log(`Cache transfers_${address} is not`);
      const resp = await this.httpService
        .get(this.url, {
          params: {
            module: 'account',
            action: 'tokentx',
            address: address,
            apikey: this.apiKey,
          },
        })
        .toPromise();
      transfers = resp.data.result;
      this.cacheManager.set<any[]>(`transfers_${address}`, transfers, {
        ttl: TRANSFERS_CACHE_TIME,
      });
      return transfers;
    }
    this.logger.log(`Cache transfers_${address} is ok`);
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
