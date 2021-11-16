import { AxiosResponse } from 'axios';
import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainIdEnum } from '@app/common';

import { Aavegotchis, Response, Svg, Users, User } from './aavegotchi.interface';
import { svgQuery, usersEthereumQuery, usersPolygonQuery } from './aavegotchi.query';

@Injectable()
export class AavegotchiSubgraph {
  protected urlEthereum: string;
  protected urlPolygon: string;
  protected urlSvg: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.urlEthereum = this.configService.get<string>('AAVEGOTCHI_SUBGRAPH_ETHEREUM');
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

  public async getUsers(addresses: Address[], chain: number): Promise<User[]> {
    const config = {
      url: this.urlPolygon,
      query: usersPolygonQuery,
    };

    switch (chain) {
      case ChainIdEnum.eth:
        config.url = this.urlEthereum;
        config.query = usersEthereumQuery;
        break;

      case ChainIdEnum.plg:
        config.url = this.urlPolygon;
        config.query = usersPolygonQuery;
        break;
    }

    return this.httpService
      .post(config.url, {
        operationName: 'users',
        variables: { addresses },
        query: config.query,
      })
      .pipe(map(({ data }: AxiosResponse<Response<Users>>) => data.data.users))
      .toPromise();
  }
}
