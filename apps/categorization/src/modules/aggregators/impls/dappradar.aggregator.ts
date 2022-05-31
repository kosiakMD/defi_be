import { eachLimit, doWhilst } from 'async';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Puppeteer } from '../../../utils';
import { Protocol } from '../../database/entities/protocol.entity';
import { ChainsRepository } from '../../database/repositories/chains.repo';
import { ContractsRepository } from '../../database/repositories/contracts.repo';
import { ProtocolChainRepository } from '../../database/repositories/protocol.chain.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { DAPPRADAR_DEFI_CHAINS_IN_PARALLEL } from '../../protocols/protocols.constant';
import { TasksAbortChecker } from '../../services/tasks.abort.checker';
import { IAggregator } from '../aggregator.interface';

@Injectable()
export class DappradarAggregator implements IAggregator {
  readonly url = 'https://dappradar.com';
  readonly name = 'dappradar';
  readonly testRun: boolean;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
    @InjectRepository(ProtocolsRepository) private readonly protocolsRepo: ProtocolsRepository,
    @InjectRepository(ChainsRepository) private readonly chainsRepo: ChainsRepository,
    @InjectRepository(ProtocolChainRepository)
    private readonly protocolChainRepo: ProtocolChainRepository,
    @InjectRepository(ContractsRepository)
    private readonly contractsRepository: ContractsRepository,
    private readonly configService: ConfigService,
    private readonly tasksAbortChecker: TasksAbortChecker,
  ) {
    this.testRun = JSON.parse(configService.get('TEST_RUN'));
  }

  async run() {
    const chainLinks = await this.getDefiChains();
    const toProcess = this.testRun ? chainLinks.slice(0, 1) : chainLinks;
    await eachLimit(toProcess, DAPPRADAR_DEFI_CHAINS_IN_PARALLEL, this.processChain.bind(this));
  }

  private async getDefiChains(): Promise<{ url: string; name: string }[]> {
    const url = `${this.url}/defi`;
    this.logger.debug(`getDefiChains from ${url}`);
    const page = await this.browser.loadPage(url);
    const chainLinks = await page.$$eval('div.rankings-filters > div > a', (links) =>
      links
        .map((l: HTMLLinkElement) => ({
          url: l.href,
          name: l.href.split('/')[5],
        }))
        .filter((l) => l.name),
    );
    await page.close();
    return chainLinks;
  }

  private async processChain(chainLink: { url: string; name: string }): Promise<void> {
    let page = 1;
    await doWhilst(
      async () => this.getDefiProtocols(chainLink.url, page),
      async (protocols) => {
        this.logger.debug(`chain: [${chainLink.name}], protocols: [${protocols.length}]`);
        await this.processProtocols(chainLink.name, protocols);
        page += 1;
        return !!protocols.length;
      },
    );
  }

  private async getDefiProtocols(
    chainUrl: string,
    pageNum: number,
  ): Promise<{ url: string; protocol: string }[]> {
    const url = `${chainUrl}/${pageNum}`;
    this.logger.debug(`getDefiProtocols from ${url}`);
    const page = await this.browser.loadPage(url);
    const protocolLinks = await page.$$eval('section > div > a', (links) =>
      links.map((l: HTMLLinkElement) => ({
        url: l.href,
        protocol: l.title,
      })),
    );
    await page.close();
    return protocolLinks;
  }

  private async processProtocols(
    chainName: string,
    protocols: { url: string; protocol: string }[],
  ) {
    const chains = await this.chainsRepo.upsertChains([chainName]);
    for (const p of protocols) {
      const { protocolUrl, contracts } = await this.grabContracts(p.url);
      this.logger.debug(
        `chain: [${chainName}], protocol: [${p.protocol}], contracts: [${contracts.length}]`,
      );
      if (protocolUrl === '') continue;
      const [protocol] = await this.protocolsRepo.upsertProtocols([
        {
          name: p.protocol,
          url: protocolUrl,
        },
      ]);
      await this.protocolChainRepo.upsertProtocolChains(protocol, chains);
      await this.saveContracts(contracts, protocol, chainName);
      this.tasksAbortChecker.ensureTaskNotAborted();
    }
  }

  private async grabContracts(
    url: string,
    retries = 1,
  ): Promise<{ protocolUrl: string; contracts: string[] }> {
    this.logger.debug(`grabContracts from ${url}`);
    const page = await this.browser.loadPage(url);
    let protocolUrl = '';
    try {
      //wait for protocolUrl (deeplink is provided by dappradar)
      await page.waitForSelector('a[href*="deeplink"]');
      //find protocolUrl (deeplink is provided by dappradar)
      const deepLink = await page.$$eval(
        'a[href*="deeplink"]',
        (links: HTMLLinkElement[]) => links.find((l) => l.href.indexOf('deeplink') > 0)?.href,
      );
      protocolUrl = await this.getProtocolUrl(deepLink);
      //click by div element to activate modal form and fetch contracts
      await page.$$eval('section div div', (divs) => {
        const divsToClick = divs.filter((el) => el.textContent.indexOf('tracking') >= 0);
        divsToClick.map((divToClick) => (divToClick as HTMLElement).click());
        return divsToClick.length;
      });
      //wait for contracts to be loaded
      await page.waitForSelector('div.modal ul li > div > a');
    } catch (e) {
      this.logger.warn(`waitForSelector error: [${e.message}]`);
      if (retries <= 3) {
        await page.close();
        return this.grabContracts(url, retries + 1);
      }
      this.logger.warn(`giving up, skipping protocol: [${url}]`);
    }
    //select all contracts
    const contracts = await page.$$eval('div.modal ul li > div > a', (links) =>
      links.map((l: HTMLLinkElement) => l.outerText),
    );
    await page.close();
    return { protocolUrl, contracts };
  }

  private async getProtocolUrl(deepLink: string): Promise<string> {
    const page = await this.browser.loadPage(deepLink);
    const protocolUrl = page.url().split('?')[0];
    await page.close();
    return protocolUrl;
  }

  private async saveContracts(addresses: string[], protocol: Protocol, chain: string) {
    const existing = await this.contractsRepository.findByAddresses(addresses);
    const existingMap = new Map(existing.map(({ address }) => [address, true]));
    const filtered = addresses.filter((a) => !existingMap.has(a));
    await this.contractsRepository.save(filtered.map((address) => ({ address, protocol, chain })));
  }
}
