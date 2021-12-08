import { AxiosResponse } from 'axios';
import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '@app/common';

import { Aavegotchis, Response, Svg, Users, User } from '../../interfaces/aavegotchi.interface';
import { svgQuery, usersPolygonQuery } from './aavegotchi.query';

@Injectable()
export class AavegotchiSubgraph {
  protected urlPolygon: string;
  protected urlSvg: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.urlPolygon = this.configService.get<string>('AAVEGOTCHI_SUBGRAPH_POLYGON');
    this.urlSvg = this.configService.get<string>('AAVEGOTCHI_SUBGRAPH_SVG');
  }

  public async getSvg(ids: string[]): Promise<Svg[]> {
    return this.httpService
      .post(this.urlSvg, {
        operationName: 'svg',
        variables: { ids },
        query: svgQuery,
      })
      .pipe(map(({ data }: AxiosResponse<Response<Aavegotchis>>) => data.data.aavegotchis))
      .toPromise();
  }

  public async getUsers(addresses: Address[]): Promise<User[]> {
    return this.httpService
      .post(this.urlPolygon, {
        operationName: 'users',
        variables: { addresses },
        query: usersPolygonQuery,
      })
      .pipe(map(({ data }: AxiosResponse<Response<Users>>) => data.data.users))
      .toPromise();
  }
}
