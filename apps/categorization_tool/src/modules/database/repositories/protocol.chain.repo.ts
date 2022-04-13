import { EntityRepository, Repository } from 'typeorm';

import { Chain } from '../entities/chain.entity';
import { ProtocolChain } from '../entities/protocol.chain.entity';
import { Protocol } from '../entities/protocol.entity';

@EntityRepository(ProtocolChain)
export class ProtocolChainRepository extends Repository<ProtocolChain> {
  async upsertProtocolChains(protocol: Protocol, chains: Chain[]) {
    return Promise.all(
      chains.map((chain) =>
        this.upsert(
          { protocol, chain },
          {
            conflictPaths: ['protocol', 'chain'],
            skipUpdateIfNoValuesChanged: true,
          },
        ),
      ),
    );
  }
}
