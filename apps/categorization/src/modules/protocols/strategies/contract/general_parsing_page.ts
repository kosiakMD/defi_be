import parallelLimit from 'async/parallelLimit';
import type { Page } from 'puppeteer';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Puppeteer } from '../../../../utils';
import { IParsingAbstract } from '../../interfaces/protocol.interface';
import { PROTOCOL_PROCESS_PARALLEL_LIMIT } from '../../protocols.constant';
import { AbstractStrategy } from '../abstract.strategy';

@Injectable()
export class GeneralPageParsing implements AbstractStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
  ) {}

  public async parsing({ url }: IParsingAbstract): Promise<string[]> {
    const page = await this.browser.loadPage(url);
    const listLinks = await this.getEvaluatedPageData(page);

    const filteredList = listLinks.filter((l) => (l?.name?.search(/contract/gi) >= 0 ? l : ''));
    await page.close();

    const arrayOfParsing: string[] = (
      await parallelLimit(
        filteredList.map(
          ({ url }) =>
            async () =>
              this.openAndParseUrl(page, url),
        ),
        PROTOCOL_PROCESS_PARALLEL_LIMIT,
      )
    ).flat();

    return Array.from(new Set(arrayOfParsing));
  }

  async openAndParseUrl(page: Page, url: string): Promise<string[]> {
    const listEl = [];

    page = await this.browser.openTab();
    await page.goto(url);
    const test = await page.content();
    const s = test?.match(/0x+[A-z0-9]{40}(?![\w\d])/gi);
    if (s) {
      listEl.push(...s);
    }

    await page.close();
    return listEl;
  }

  async getEvaluatedPageData(page: Page): Promise<{ name: string; url: string }[]> {
    const evaluated = await page.evaluate(() => {
      const listLinks = document.querySelectorAll('a');
      const list = [];
      for (const key in listLinks) {
        list.push({
          name: listLinks[key].text,
          url: listLinks[key].href,
        });
      }
      return list;
    });

    return evaluated;
  }
}
