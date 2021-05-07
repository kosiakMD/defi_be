import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EtherscanApi {
  private readonly bscUrl: string;
  private bscApiKey: string;
  private readonly ethUrl: string;
  private ethApiKey: string;

  constructor(private httpService: HttpService, private configService: ConfigService) {
    this.bscUrl = this.configService.get<string>('BSCSCAN_URL');
    this.bscApiKey = this.configService.get<string>('BSCSCAN_KEY');
    this.ethUrl = this.configService.get<string>('ETHERSCAN_URL');
    this.ethApiKey = this.configService.get<string>('ETHERSCAN_KEY');
  }

  async getEthTransfers(address: string, chain: number): Promise<any> {
    const url = Number(chain) === 1 ? this.ethUrl : this.bscUrl;

    return this.httpService
      .get(url, {
        params: {
          module: 'account',
          action: 'tokentx',
          address: address,
          apikey: Number(chain) === 1 ? this.ethApiKey : this.bscApiKey,
        },
      })
      .toPromise();
  }
}
