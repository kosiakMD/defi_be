import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';

export class CurveApi {
  constructor(private httpService: HttpService) {}

  getSubgraphPoolData(poolSubgraphDataUrl: string) {
    return this.httpService
      .get(poolSubgraphDataUrl)
      .pipe(map((response) => response.data?.data))
      .toPromise()
      .catch(() => {
        return {};
      });
  }

  getMainPoolsGaugeRewardsData(additionalRewardsUrl: string) {
    return this.httpService
      .get(additionalRewardsUrl)
      .pipe(map((response) => response.data?.data))
      .toPromise()
      .catch(() => {
        return {};
      });
  }

  getFactoryPoolsData(factoryPoolsUrl: string) {
    return this.httpService
      .get(factoryPoolsUrl)
      .pipe(map((response) => response.data?.data))
      .toPromise()
      .catch(() => {
        return {};
      });
  }

  getCrvApysData(apyUrl: string) {
    return this.httpService
      .get(apyUrl)
      .pipe(map((response) => response.data?.data))
      .toPromise()
      .catch(() => {
        return {};
      });
  }

  getApiGauges(gaugesUrl: string) {
    return this.httpService
      .get(gaugesUrl)
      .pipe(map((response) => response.data?.data))
      .toPromise()
      .catch(() => {
        return {};
      });
  }
}
