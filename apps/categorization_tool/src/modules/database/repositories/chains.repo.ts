import { EntityRepository, Repository } from 'typeorm';

import { Chain } from '../entities/chain.entity';

@EntityRepository(Chain)
export class ChainsRepository extends Repository<Chain> {
  async findOneByNameCaseInsensitive(name: string): Promise<Chain> {
    const query = `
        SELECT ch.id,
               ch.name
        FROM chains ch
        WHERE ch.name ILIKE $1
        LIMIT 1
    `;
    return (await this.query(query, [name]))[0];
  }

  async upsertChains(chainNames: string[]): Promise<Chain[]> {
    return Promise.all(
      chainNames.map(
        async (chainName): Promise<Chain> =>
          (await this.findOneByNameCaseInsensitive(chainName)) ||
          (await this.save({ name: chainName })),
      ),
    );
  }

  async upsertChainsSync(chainNames: string[]): Promise<Chain[]> {
    const list: Chain[] = [];
    for (const chain of chainNames) {
      list.push(
        (await this.findOneByNameCaseInsensitive(chain)) || (await this.save({ name: chain })),
      );
    }

    return list;
  }
}
