import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AbiFetcherService {
  constructor(private httpService: HttpService) {}

  async getAbi({ url, apiKey }, contractAddress): Promise<any> {
    const apiUrl = String(url).replace(/\/$/, '/api');
    const result = await this.httpService
      .get(apiUrl, {
        params: {
          module: 'contract',
          action: 'getabi',
          address: contractAddress,
          apikey: apiKey,
        },
      })
      .toPromise();
    return JSON.parse(result.data.result);
  }
}
