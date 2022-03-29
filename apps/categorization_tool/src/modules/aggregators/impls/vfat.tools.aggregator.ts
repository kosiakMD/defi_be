import series from 'async/series';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Puppeteer } from '../../../utils';
import { ChainsRepository } from '../../database/repositories/chains.repo';
import { ProtocolChainRepository } from '../../database/repositories/protocol.chain.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { IAggregator } from '../aggregator.interface';

@Injectable()
export class VfatToolsAggregator implements IAggregator {
  readonly url = 'https://vfat.tools';
  readonly name = 'VfatTools';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
    @InjectRepository(ProtocolsRepository) private readonly protocolsRepo: ProtocolsRepository,
    @InjectRepository(ChainsRepository) private readonly chainsRepo: ChainsRepository,
    @InjectRepository(ProtocolChainRepository)
    private readonly protocolChainRepo: ProtocolChainRepository,
  ) {}

  async run() {
    const page = await this.browser.loadPage(this.url);
    const chainLinks = await this.extractChainLinks(page);
    await page.close();

    await series(
      chainLinks.map(({ url, name }) => async () => {
        this.logger.debug(`parsing page for chain: [${name}] - ${url}`);
        const protocolsData = await this.parseChainPage(url);
        this.logger.debug(
          `found protocols for chain: [${name}] - ${protocolsData.map((p) => p.name)}`,
        );
        const chains = await this.chainsRepo.upsertChains([name]);
        const protocols = await this.protocolsRepo.upsertProtocols(protocolsData);
        await Promise.all(
          protocols.map((p) => this.protocolChainRepo.upsertProtocolChains(p, chains)),
        );
      }),
    );
  }

  private async extractChainLinks(page): Promise<{ url: string; name: string }[]> {
    return page.evaluate(() => {
      const chainLinks = [];
      const links = document.querySelectorAll('a');
      for (const key in links) {
        if (
          /^https:\/\/vfat.tools\/[a-zA-Z]+\/$/.test(links[key].href) &&
          links[key].text !== 'Various' &&
          links[key].text !== 'All' &&
          links[key].text !== 'MCN'
        ) {
          chainLinks.push({
            url: links[key].href,
            name: links[key].text,
          });
        }
      }
      return chainLinks;
    });
  }

  private async parseChainPage(url: string): Promise<{ name: string; url: string }[]> {
    const page = await this.browser.loadPage(url);
    const content = await page.evaluate(() => document.documentElement.outerHTML);
    const lines = content.split('\n');
    let lineNumber = 0;
    //skip everything to the table
    while (lineNumber < lines.length && !lines[lineNumber].match(`------------------`))
      lineNumber++;
    if (lineNumber >= lines.length) return [];
    //skip table header
    lineNumber += 5;
    const protocolsInfo = [];
    //collect table rows
    while (lines[lineNumber].startsWith('|')) {
      const values = lines[lineNumber].split('|');
      protocolsInfo.push({
        name: values[1].trim(),
        url: values[values.length - 2].trim(),
      });
      lineNumber++;
    }
    await page.close();
    return protocolsInfo;
  }
}
