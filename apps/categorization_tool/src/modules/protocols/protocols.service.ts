import { parallelLimit, series } from 'async';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { nameFromUrl, Puppeteer } from '../../utils';
import { Link } from '../database/entities/link.entity';
import { Protocol } from '../database/entities/protocol.entity';
import { LinkTypeEnum } from '../database/enum/link.type.enum';
import { ChainsRepository } from '../database/repositories/chains.repo';
import { GithubFilesRepository } from '../database/repositories/github.files.repo';
import { LinksRepository } from '../database/repositories/links.repo';
import { ProtocolChainRepository } from '../database/repositories/protocol.chain.repo';
import { ProtocolsRepository } from '../database/repositories/protocols.repo';
import { FilteredLinks, IListProtocol } from './interfaces/protocol.interface';
import {
  PARSE_GITHUB_LINKS_PARALLEL_LIMIT,
  PROTOCOL_PROCESS_PARALLEL_LIMIT,
} from './protocols.constant';
import { ContractsService } from './services/contracts.service';
import { GithubService } from './services/github.service';
import { MainPageStrategy, AppPageStrategy } from './strategies';
import { AbstractStrategy } from './strategies/abstract.strategy';

@Injectable()
export class ProtocolService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(Puppeteer) protected readonly puppeteer: Puppeteer,
    @InjectRepository(ProtocolsRepository) private readonly protocolsRepo: ProtocolsRepository,
    @InjectRepository(LinksRepository) private readonly linksRepo: LinksRepository,
    @InjectRepository(GithubFilesRepository)
    private readonly githubFilesRepo: GithubFilesRepository,
    @InjectRepository(ProtocolChainRepository)
    private readonly protocolChainRepo: ProtocolChainRepository,
    @InjectRepository(ChainsRepository) private readonly chainsRepo: ChainsRepository,
    private readonly mainPageParsingStrategy: MainPageStrategy,
    private readonly appPageParsingStrategy: AppPageStrategy,
    private readonly contractService: ContractsService,
    private readonly githubService: GithubService,
  ) {}

  async parseProtocolsMainPage() {
    const listProtocols = await this.protocolsRepo.findAll();
    const websites = listProtocols.map((protocol) => ({ url: protocol.url, protocol }));
    const links = await this.scanWebsitesForLinks(websites, this.mainPageParsingStrategy);
    await this.saveLinks(links);
  }

  async parseProtocolsAppPage() {
    const listProtocols = await this.protocolsRepo.findAllWithLinks();
    const websites = listProtocols.flatMap((protocol) =>
      protocol.links
        .filter((l) => l.type === LinkTypeEnum.APP)
        .map(({ url }) => ({ url, protocol })),
    );
    const links = await this.scanWebsitesForLinks(websites, this.appPageParsingStrategy);
    await this.saveLinks(links);
  }

  async parseProtocolsDocsPage() {
    const listProtocols = await this.protocolsRepo.findAllWithLinks();
    const listProtocolsWithLink = listProtocols.filter((p) => p.links.length > 0);
    await this.contractService.run(listProtocolsWithLink);
  }

  async parseProtocolsGithubPage() {
    const links = await this.linksRepo.findGithubLinksWithoutFiles();
    await parallelLimit(
      links.map(({ id, url }) => async () => {
        const files = await this.githubService.getFilesByExtensions(url, ['.vy', '.sol']);
        await this.githubFilesRepo.save(
          files.map(({ path, downloadUrl, content }) => ({
            path,
            downloadUrl,
            content,
            link: { id },
          })),
        );
      }),
      PARSE_GITHUB_LINKS_PARALLEL_LIMIT,
    );
  }

  async fetchAbi() {
    await this.contractService.fetchAbiAndAbiCode();
  }

  async crawlHtml() {
    const links = await this.linksRepo.findByTypesWithoutHtml([
      LinkTypeEnum.DOCS,
      LinkTypeEnum.APP,
    ]);
    await series(
      links.map(({ id, url }) => async () => {
        const page = await this.puppeteer.loadPage(url);
        const html = await page.evaluate(() => document.documentElement.outerHTML);
        await this.linksRepo.update({ id }, { html });
        await page.close();
        this.logger.debug(`updated html for link - [${url}]`);
      }),
    );
  }

  async parseCustomProtocol(listProtocols: IListProtocol) {
    const protocol = await this.ensureProtocolExists(listProtocols);
    const websites = [{ url: protocol.url, protocol }];
    const links = await this.scanWebsitesForLinks(websites, this.mainPageParsingStrategy);
    await this.saveLinks(links);
  }

  private async saveLinks(links: Link[]) {
    try {
      const listFound = await this.linksRepo.find({
        where: links.map((l) => ({
          url: l?.url,
          type: l?.type,
          protocol: l?.protocol?.id,
        })),
      });
      const sortBy = new Map(listFound.map((l) => [l?.url, l]));
      const filteredLinks = links.filter((l) => (!sortBy.has(l?.url) ? l : ''));
      await this.linksRepo.save(filteredLinks);
    } catch (e) {
      this.logger.error(`Save links in DB error: ${e.message}`);
    }
  }

  private async ensureProtocolExists(listProtocol: IListProtocol): Promise<Protocol> {
    const existingProtocol = await this.protocolsRepo.findOneByUrlWithLinks(listProtocol.url);
    if (existingProtocol) {
      return existingProtocol;
    }
    if (listProtocol.chain) {
      const [chain] = await this.chainsRepo.upsertChains([listProtocol.chain]);
      const [protocol] = await this.protocolsRepo.upsertProtocols([
        {
          url: listProtocol.url,
          name: listProtocol.name || nameFromUrl(listProtocol.url),
        },
      ]);
      await this.protocolChainRepo.upsertProtocolChains(protocol, [chain]);
      return protocol;
    }
  }

  private async scanWebsitesForLinks(
    websites: { url: string; protocol: Protocol }[],
    strategy: AbstractStrategy,
  ): Promise<Link[]> {
    this.logger.debug('scanWebsitesForLinks started');
    const arraysOfLinks = await parallelLimit(
      websites.map(({ url, protocol }) => async () => {
        try {
          const [, linksMap] = await strategy.parsing({
            url,
            name: protocol.name,
          });
          return [
            ...this.linksFromParsedResult(linksMap, LinkTypeEnum.APP, protocol),
            ...this.linksFromParsedResult(linksMap, LinkTypeEnum.GITHUB, protocol),
            ...this.linksFromParsedResult(linksMap, LinkTypeEnum.DOCS, protocol),
          ];
        } catch (e) {
          this.logger.error(`website scanning error ${url} error: ${e.message}`);
        }
      }),
      PROTOCOL_PROCESS_PARALLEL_LIMIT,
    );
    this.logger.debug('scanWebsitesForLinks finished');
    return arraysOfLinks.flat();
  }

  private linksFromParsedResult(
    linksMap: FilteredLinks,
    type: LinkTypeEnum,
    protocol: Protocol,
  ): Link[] {
    return Array.from(new Set(linksMap.get(type))).map((url) => ({ url, type, protocol } as Link));
  }
}
