import { existsSync, mkdirSync } from 'fs';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { findSubText, getScreenshot, Puppeteer } from '../../../utils';
import { LinkTypeEnum } from '../../database/enum/link.type.enum';
import { FilteredLinks, IParsingAbstract } from '../interfaces/protocol.interface';
import { AbstractStrategy } from './abstract.strategy';

@Injectable()
export class MainPageStrategy implements AbstractStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
    private readonly configService: ConfigService,
  ) {}

  async parsing({ url, name }: IParsingAbstract): Promise<[string, FilteredLinks, string, string]> {
    const page = await this.browser.loadPage(url);
    const listLinks = await this.getEvaluatedPageData(page);
    const filtered = this.filterLinks(listLinks);
    const screenshotPath = this.getScreenshotPath(url, name);
    const dirScreen = await getScreenshot(page, url, screenshotPath);
    await page.close();
    return [url, filtered, dirScreen, name];
  }

  private getScreenshotPath(url: string, protocolName: string): string {
    const genName = `${url.replace(/[:/.]/gi, '_')}.png`;
    const dir = `${this.configService.get('DIR_SAVE_SCREENSHOTS')}/${protocolName}/`;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return `${dir}${genName}`;
  }

  private async getEvaluatedPageData(page) {
    return page.evaluate(() => {
      const listLinks = [];
      const links = document.querySelectorAll('a');
      for (const key in links) {
        listLinks.push({
          url: links[key].href,
          name: links[key].text,
        });
      }
      return listLinks;
    });
  }

  private filterLinks(list: { url: string; name: string }[]): FilteredLinks {
    const filtered: FilteredLinks = new Map<LinkTypeEnum, string[]>([
      [LinkTypeEnum.GITHUB, []],
      [LinkTypeEnum.DOCS, []],
      [LinkTypeEnum.APP, []],
    ]);
    list.forEach(({ url, name }) => {
      if (url?.includes('github')) {
        return filtered.get(LinkTypeEnum.GITHUB).push(url);
      }
      if (findSubText(url, ['gitbook', 'docs'])) {
        return filtered.get(LinkTypeEnum.DOCS).push(url);
      }
      if (
        findSubText(url, ['app.', 'staking.', 'farming.']) ||
        findSubText(name, ['App', 'enter', 'Enter', 'stake', 'Stake'])
      ) {
        return filtered.get(LinkTypeEnum.APP).push(url);
      }
    });
    return filtered;
  }
}
