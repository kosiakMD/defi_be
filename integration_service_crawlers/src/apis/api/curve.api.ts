import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';

@Injectable()
export class CurveApi {
  protected apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('CURVE_API_URL');
  }

  async getApys(): Promise<any> {
    return this.httpService
      .get(this.apiUrl.concat('raw-stats/apys.json'))
      .pipe(map((response) => response.data))
      .toPromise();
  }
}
