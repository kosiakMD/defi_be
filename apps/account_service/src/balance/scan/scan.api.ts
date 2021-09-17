import { Cache } from 'cache-manager';
import { map } from 'rxjs/operators';

import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '@app/common/constatnt';
import { ChainIdEnum } from '@app/common/enum';

import { isEthChain } from '../../utils/web3';
import { EtherscanTransfer } from '../interfaces/etherscan.interfaces';

const TRANSFERS_CACHE_TIME = 30; // 30 sec

// TODO refactor to ScanFactory depends on network
@Injectable()
export class ScanApi {
  private readonly bscUrl: string;
  private readonly bscApiKey: string;
  private readonly ethUrl: string;
  private readonly ethApiKey: string;
  private readonly networks: Record<number, string>;

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
    this.networks = {
      [CHAIN_ID_ETH]: 'eth',
      [CHAIN_ID_BSC]: 'bsc',
    };
  }

  async getEthTransfers(address: string, chain: ChainIdEnum): Promise<any> {
    const url = isEthChain(chain) ? this.ethUrl : this.bscUrl;
    const action = 'tokentx';
    const chainPrefix = this.networks[chain];

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
              apikey: isEthChain(chain) ? this.ethApiKey : this.bscApiKey,
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
