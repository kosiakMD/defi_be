import { EntityRepository, In, Repository } from 'typeorm';

import { Protocol } from '../entities/protocol.entity';
import { LinkTypeEnum } from '../enum/link.type.enum';

@EntityRepository(Protocol)
export class ProtocolsRepository extends Repository<Protocol> {
  async findAllLimit(skip = 0, take = 100): Promise<Protocol[]> {
    return this.find({ skip, take });
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

  async findManyByUrlWithLinks(urls: string[]): Promise<Protocol[]> {
    return this.find({
      where: {
        url: In(urls),
      },
      relations: ['links'],
    });
  }

  async findAllWithLinks(): Promise<Protocol[]> {
    return this.find({
      relations: ['links'],
    });
  }

  async findWithLinksLimit(
    linkType: LinkTypeEnum,
    processed = false,
    skip = 0,
    take = 100,
  ): Promise<Protocol[]> {
    return this.createQueryBuilder('protocols')
      .leftJoinAndSelect('protocols.links', 'links')
      .where('links.type = :linkType', { linkType })
      .andWhere('links.processed = :processed', { processed })
      .skip(skip)
      .take(take)
      .getMany();
  }

  async findOneByNameCaseInsensitive(name: string, url: string): Promise<Protocol> {
    const query = `
        SELECT p.id,
               p.name,
               p.url
        FROM protocols p
        WHERE p.name ILIKE $1
           OR (SELECT token FROM ts_debug(p.url) WHERE alias = 'host') =
              (SELECT token FROM ts_debug($2) WHERE alias = 'host')
        LIMIT 1
    `;
    return (await this.query(query, [name, url]))[0];
  }

  async upsertProtocols(protocolsData: { name: string; url: string }[]): Promise<Protocol[]> {
    return Promise.all(
      protocolsData.map(
        async ({ name, url }) =>
          (await this.findOneByNameCaseInsensitive(name, url)) || (await this.save({ name, url })),
      ),
    );
  }
}
