import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../common/Logger/Logger.service';
import { ImpermanentLossResponseDto } from './dto/impermanentLoss.dto';
import { ImpermanentLossDto } from './dto/impermanentLoss.dto';

@Injectable()
export class ImpermanentLossService {
  private readonly calcUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.calcUrl = this.configService.get<string>('IL_CALCULATOR');
  }

  async getCalcData(query: ImpermanentLossDto): Promise<ImpermanentLossResponseDto> {
    try {
      this.logger.time('request: ' + this.calcUrl);

      const data = await this.httpService
        .post(this.calcUrl, query)
        .pipe(map((response) => response.data))
        .toPromise();

      this.logger.timeEnd('request: ' + this.calcUrl);

      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }
}
