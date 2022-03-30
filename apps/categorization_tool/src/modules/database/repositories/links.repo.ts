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

  async findGithubLinksWithoutFiles(): Promise<Link[]> {
    const query = `
        SELECT l.id,
               l.url
        FROM links l
                 LEFT JOIN github_files gf ON l.id = gf.link_id
        WHERE l.type = 'github'
          AND gf.id IS NULL
    `;
    return this.query(query);
  }
}
