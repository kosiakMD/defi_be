import { EntityRepository, Repository } from 'typeorm';

import { Chain } from '../entities/chain.entity';
import { ProtocolChain } from '../entities/protocol.chain.entity';
import { Protocol } from '../entities/protocol.entity';

@EntityRepository(ProtocolChain)
export class ProtocolChainRepository extends Repository<ProtocolChain> {
  async findOneByProtocolAndChainWithChainAndProtocol(
    protocol: Protocol,
    chain: Chain,
  ): Promise<ProtocolChain> {
    return this.findOne({
      relations: ['chain', 'protocol'],
      where: { protocol, chain },
    });
  }

  async upsertProtocolChains(protocol: Protocol, chains: Chain[]) {
    return Promise.all(
      chains.map(async (chain) => {
        return (
          (await this.findOneByProtocolAndChainWithChainAndProtocol(protocol, chain)) ||
          (await this.save({ protocol, chain }))
        );
      }),
    );
  }
}
