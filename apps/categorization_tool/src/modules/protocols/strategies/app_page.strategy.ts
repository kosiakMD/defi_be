import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { checkingGithubUrl, findSubText, Puppeteer } from '../../../utils';
import { LinkTypeEnum } from '../../database/enum/link.type.enum';
import { FilteredLinks, IParsingAbstract } from '../interfaces/protocol.interface';
import { AbstractStrategy } from './abstract.strategy';

@Injectable()
export class AppPageStrategy implements AbstractStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
    private readonly configService: ConfigService,
  ) {}

  async parsing({ url }: IParsingAbstract): Promise<[string, FilteredLinks]> {
    const page = await this.browser.loadPage(url);
    const listLinks = await page.$$eval('a', (a: HTMLLinkElement[]) =>
      a.map((b) => ({ name: b.textContent, url: b.href })),
    );
    const filtered = this.filterLinks(listLinks);
    await page.close();
    return [url, filtered];
  }

  private filterLinks(list: { url: string; name: string }[]): FilteredLinks {
    const filtered: FilteredLinks = new Map<LinkTypeEnum, string[]>([
      [LinkTypeEnum.GITHUB, []],
      [LinkTypeEnum.DOCS, []],
    ]);
    list.forEach(({ url }) => {
      if (url?.includes('github') && checkingGithubUrl(url)) {
        return filtered.get(LinkTypeEnum.GITHUB).push(url);
      }
      if (findSubText(url, ['gitbook', 'docs'])) {
        return filtered.get(LinkTypeEnum.DOCS).push(url);
      }
    });
    return filtered;
  }
}
