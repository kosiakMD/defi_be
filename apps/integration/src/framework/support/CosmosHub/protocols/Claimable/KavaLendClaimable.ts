import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { IRootProtocol } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { IKavaClaimable, IKavaClaimableResponse } from '../interfaces/Kava/KavaClaimable';
import { KavaSwapClaimable } from './KavaSwapClaimable';

export type IClaimableFeatureEntryMinimal = BaseWithTokens<ISupplyTokenMinimal, void, void, void>;
export type IClaimableFeatureEntryOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  void,
  void,
  void
>;
export type IClaimableFeatureEntryUser = BaseWithTokens<ISupplyTokenUserEntry, void, void, void>;

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
      supply: {
        token: {
          address: tokenAddresses,
        },
        totalSupplied: '0',
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
