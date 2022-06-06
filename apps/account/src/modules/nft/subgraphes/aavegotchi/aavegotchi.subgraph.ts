import { AxiosResponse } from 'axios';
import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '@app/common';

import { Aavegotchis, Id, Response, Svg, User, Users } from '../../interfaces/aavegotchi.interface';
import {
  svgQuery,
  usersPortalsGotchisIdsQuery,
  usersPortalsGotchisQuery,
} from './aavegotchi.query';

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
        query: usersPortalsGotchisQuery,
      })
      .pipe(map(({ data }: AxiosResponse<Response<Users>>) => data.data.users))
      .toPromise();
  }

  public async getPortalsGotchisIds(addresses: Address[]): Promise<User<Id, Id>[]> {
    return this.httpService
      .post(this.urlPolygon, {
        operationName: 'users',
        variables: { addresses },
        query: usersPortalsGotchisIdsQuery,
      })
      .pipe(map(({ data }: AxiosResponse<Response<Users<User<Id, Id>>>>) => data.data.users))
      .toPromise();
  }
}
