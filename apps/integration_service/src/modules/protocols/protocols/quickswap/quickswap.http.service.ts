import { firstValueFrom, from, map } from 'rxjs';
import { filter, toArray } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { Address } from '@app/common';

import { IContractInfo, IQuickswapResponse } from './quickswap.interfaces';

const stakingListUrl =
  'https://raw.githubusercontent.com/QuickSwap/interface-v2/master/src/constants/stake.json';

interface IMinimalQuickswapHttpResult {
  stakingRewardAddress: Address;
  pair: Address;
}

@Injectable()
export class QuickswapHttpService {
  constructor(protected readonly http: HttpService) {}

  private formatRawData(result: IMinimalQuickswapHttpResult): IContractInfo {
    return {
      stakingContractAddress: result.stakingRewardAddress,
      pairAddress: result.pair,
    };
  }

  private filterStakingInfo(item: IContractInfo): boolean {
    return Boolean(item.stakingContractAddress && item.pairAddress);
  }

  async getStakingPools(): Promise<IQuickswapResponse> {
    const { data } = await firstValueFrom(this.http.get(stakingListUrl));
    const { stakingrewards, oldstakingrewards, veryoldstakingrewards, dualrewards } = data;
    const allStakingContracts = [].concat(stakingrewards, oldstakingrewards, veryoldstakingrewards);

    const [stakingContracts, dualStakingContracts] = await Promise.all([
      firstValueFrom(
        from(allStakingContracts).pipe(
          map(this.formatRawData), //
          filter(this.filterStakingInfo),
          toArray(),
        ),
      ),
      firstValueFrom(
        from(dualrewards).pipe(
          map(this.formatRawData), //
          filter(this.filterStakingInfo),
          toArray(),
        ),
      ),
    ]);

    return { stakingContracts, dualStakingContracts };
  }
}
