import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { IRootProtocol } from '../../../interfaces';
import { IKavaClaimable, IKavaClaimableResponse } from '../interfaces/Kava/KavaClaimable';
import { IClaimableFeatureEntryMinimal, KavaSwapClaimable } from './KavaSwapClaimable';

export class KavaLendClaimable extends KavaSwapClaimable implements IRootProtocol {
  async getCacheableOpportunityData(): Promise<IClaimableFeatureEntryMinimal[]> {
    const $data = this.httpService.get(this.parametersClaimable).pipe(
      map(({ data }) => data.result?.hard_supply_reward_periods),
      toArray(),
    );

    const collaterals = await firstValueFrom($data);

    const rewardTokens: string[] = collaterals[0].flatMap((collateral) => {
      return collateral['rewards_per_second'].flatMap((rewarded) => rewarded.denom);
    });

    return Array.from(new Set(rewardTokens)).map((address) =>
      this.toClaimableFeatureEntryMinimal(address),
    );
  }

  protected toClaimableFeatureEntryMinimal(tokenAddresses: string): IClaimableFeatureEntryMinimal {
    return {
      id: tokenAddresses + '::' + 'lend-claimable',
      chain: this.meta.chain,
      feature: this.meta.feature,
      reward: {
        token: {
          address: tokenAddresses,
        },
      },
    };
  }

  protected accountClaimable(address: string): Promise<IKavaClaimable[]> {
    const $data = this.httpService
      .get<IKavaClaimableResponse>(this.incentiveClaimable, {
        params: { owner: address },
      })
      .pipe(
        mergeMap((response) => {
          return [response.data.result?.hard_claims?.[0]?.base_claim];
        }),
        toArray(),
      );
    return firstValueFrom($data);
  }
}
