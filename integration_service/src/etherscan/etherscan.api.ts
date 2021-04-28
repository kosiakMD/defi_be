import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EtherscanApi {
  private url: string;
  private apiKey: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.url = this.configService.get<string>('BSCSCAN_URL');
    this.apiKey = this.configService.get<string>('BSCSCAN_KEY');
  }

  async getTransfers(address: string): Promise<any> {
    return this.httpService
      .get(this.url,
        {
          params: {
            module: 'account',
            action: 'tokentx',
            address: address,
            apikey: this.apiKey,
          },
        })
      .toPromise();
  }
}

export interface Response {
  data: EtherscanTransfersResponse
}

export interface EtherscanTransfersResponse {
  status: number,
  message: string,
  result: EtherscanTransfer[]
}

export interface EtherscanTransfer {
  blockNumber: number,
  timeStamp: number,
  hash: string,
  nonce: number,
  blockHash: string,
  from: string,
  contractAddress: string,
  to: string,
  value: number,
  tokenName: string,
  tokenSymbol: string,
  tokenDecimal: number,
  transactionIndex: number,
  gas: number,
  gasPrice: number,
  gasUsed: number,
  cumulativeGasUsed: number,
  input: string,
  confirmations: number
}
