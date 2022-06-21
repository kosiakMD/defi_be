import { Injectable } from '@nestjs/common';

import { Address } from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { CardanoDelegationsStrategy } from './strategies/delegations/cardano-delegations.strategy';
import { DelegationsStrategy } from './strategies/delegations/delegation.strategy';
import { SolanaDelegationsStrategy } from './strategies/delegations/solana-delegations.strategy';
import { TerraDelegationsStrategy } from './strategies/delegations/terra-delegations.strategy';

@Injectable()
export class DelegationsService {
  constructor(
    private readonly solanaDelegationsStrategy: SolanaDelegationsStrategy,
    private readonly cardanoDelegationsStrategy: CardanoDelegationsStrategy,
    private readonly terraDelegationsStrategy: TerraDelegationsStrategy,
  ) {}

  delegationStrategies: DelegationsStrategy[] = [
    this.solanaDelegationsStrategy,
    this.cardanoDelegationsStrategy,
    this.terraDelegationsStrategy,
  ];

  // TODO: Do not use any!
  public async getUserDelegations(addresses: Address[]): Promise<Record<Address, any>[]> {
    return Promise.all(addresses.map((a) => this.getDelegationsForAddress(a)));
  }

  private async getDelegationsForAddress(address: string): Promise<Record<Address, any>> {
    const allResult = await Promise.allSettled(
      this.delegationStrategies.map((strategy) => strategy.getDelegatedAssets(address)),
    );

    // TODO better to handle only specific error in Cardano - TBD with Artem
    // Some Cardano delegator throw exception if address is not valid for its network and we ignore them
    const result = handlePromiseAllSettled(allResult)[0];

    return { [address]: result.flat() };
  }
}
