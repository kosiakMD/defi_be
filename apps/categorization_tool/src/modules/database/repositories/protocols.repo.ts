import { EntityRepository, Repository } from 'typeorm';

import { Protocol } from '../entities/protocol.entity';

@EntityRepository(Protocol)
export class ProtocolsRepository extends Repository<Protocol> {
  async findWithLinks(): Promise<Protocol[]> {
    return this.find({
      relations: ['links'],
    });
  }

  async findWithoutLinks() {
    const query = `
        SELECT p.id,
               p.name,
               p.url
        FROM protocols p
        LEFT JOIN links l ON p.id = l.protocol_id
        WHERE l.id IS NULL
    `;
    return this.query(query);
  }

  async findOneByUrlWithLinks(url: string): Promise<Protocol> {
    return this.findOne({
      where: { url },
      relations: ['links'],
    });
  }

  async findOneByNameCaseInsensitive(name: string): Promise<Protocol> {
    const query = `
        SELECT p.id,
               p.name,
               p.url
        FROM protocols p
        WHERE p.name ILIKE $1
        LIMIT 1
    `;
    return (await this.query(query, [name]))[0];
  }

  async upsertProtocols(protocolsData: { name: string; url: string }[]): Promise<Protocol[]> {
    return Promise.all(
      protocolsData.map(
        async ({ name, url }) =>
          (await this.findOneByNameCaseInsensitive(name)) || (await this.save({ name, url })),
      ),
    );
  }
}
