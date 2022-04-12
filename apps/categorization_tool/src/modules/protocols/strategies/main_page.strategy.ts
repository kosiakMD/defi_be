import { existsSync, mkdirSync } from 'fs';
import { Page } from 'puppeteer';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import {
  checkingGithubUrl,
  findSubText,
  getScreenshot,
  nameFromUrl,
  Puppeteer,
} from '../../../utils';
import { LinkTypeEnum } from '../../database/enum/link.type.enum';
import { FilteredLinks, IParsingAbstract } from '../interfaces/protocol.interface';
import { AbstractStrategy } from './abstract.strategy';

@Injectable()
export class MainPageStrategy implements AbstractStrategy {
  readonly screenshotEnabled: boolean;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
    private readonly configService: ConfigService,
  ) {
    this.screenshotEnabled = JSON.parse(this.configService.get('SCREENSHOTS_ENABLED'));
  }

  async parsing({ url, name }: IParsingAbstract): Promise<[string, FilteredLinks, string, string]> {
    const page = await this.browser.loadPage(url);
    const listLinks = await page.$$eval('a', (a: HTMLLinkElement[]) =>
      a.map((b) => ({ name: b.textContent, url: b.href })),
    );

    const filtered = this.filterLinks(listLinks, url);
    const dirScreen = await this.takeScreenshot(page, url, name);
    await page.close();
    return [url, filtered, dirScreen, name];
  }

  private async takeScreenshot(page: Page, url: string, protocolName: string): Promise<string> {
    if (!this.screenshotEnabled) return;
    const screenshotPath = this.getScreenshotPath(url, protocolName);
    return getScreenshot(page, url, screenshotPath);
  }

  private getScreenshotPath(url: string, protocolName: string): string {
    const genName = `${url.replace(/[:/.]/gi, '_')}.png`;
    const dir = `${this.configService.get('DIR_SAVE_SCREENSHOTS')}/${protocolName}/`;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return `${dir}${genName}`;
  }

  private filterLinks(list: { url: string; name: string }[], protocolUrl: string): FilteredLinks {
    const filtered: FilteredLinks = new Map<LinkTypeEnum, string[]>([
      [LinkTypeEnum.GITHUB, []],
      [LinkTypeEnum.DOCS, []],
      [LinkTypeEnum.APP, []],
    ]);
    const pName = nameFromUrl(protocolUrl);
    list.forEach(({ url, name }) => {
      if (url?.includes('github') && checkingGithubUrl(url)) {
        return filtered.get(LinkTypeEnum.GITHUB).push(url);
      }
      if (findSubText(url, ['gitbook', 'docs'])) {
        return filtered.get(LinkTypeEnum.DOCS).push(url);
      }
      if (
        url.indexOf(pName) >= 0 &&
        (findSubText(url, ['app.', 'staking.', 'farming.']) ||
          findSubText(name, ['App', 'enter', 'Enter', 'stake', 'Stake']))
      ) {
        return filtered.get(LinkTypeEnum.APP).push(url);
      }
    });
    return filtered;
  }
}
