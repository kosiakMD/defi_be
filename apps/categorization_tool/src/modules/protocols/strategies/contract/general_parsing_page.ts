import type { Page } from 'puppeteer';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { toChunkedArray } from '@app/common/utils/transform';

import { Puppeteer } from '../../../../utils';
import { IParsingAbstract, IParsingReturned } from '../../interfaces/protocol.interface';
import { NUMBER_ITEMS_CHUNK } from '../../protocols.constant';
import { AbstractStrategy } from '../abstract.strategy';

@Injectable()
export class GeneralPageParsing implements AbstractStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
  ) {}

  public async parsing({ link }: IParsingAbstract): Promise<IParsingReturned[]> {
    const page = await this.browser.openTab();
    await page.goto(link.url);
    await page.waitForTimeout(1000);
    const listLinks = await this.getEvaluatedPageData(page);

    const filteredList = listLinks.filter((l) => (l?.name?.search(/contract/gi) >= 0 ? l : ''));
    await page.close();

    const execute = [];
    const executedList = [];
    const chunks = toChunkedArray(filteredList, NUMBER_ITEMS_CHUNK);
    for (const chunk of chunks) {
      for (const { url } of chunk) {
        execute.push(this.openAndParseUrl(page, url));
      }

      const executed = await Promise.allSettled(execute);
      executedList.push(...executed);
    }

    const mappedList = executedList
      .map(({ status, value }) => (status === 'fulfilled' ? value : []))
      .flat();

    const removedDublicate = [...new Set(mappedList)];
    return removedDublicate.map((v) => ({
      contract: v,
      protocol: link.protocol.id,
      extras: link,
    }));
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
