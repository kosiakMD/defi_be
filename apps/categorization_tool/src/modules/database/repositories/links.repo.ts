import { EntityRepository, Repository } from 'typeorm';

import { Link } from '../entities/link.entity';
import { LinkTypeEnum } from '../enum/link.type.enum';

@EntityRepository(Link)
export class LinksRepository extends Repository<Link> {
  async findByTypesWithoutHtml(linkTypes: LinkTypeEnum[]): Promise<Link[]> {
    return this.find({
      where: linkTypes.map((t) => ({ type: t, html: null })),
    });
  }
}
