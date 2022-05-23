import { doWhilst, parallelLimit, series } from 'async';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CommandRequestDto } from '../../common/dto/command.request.dto';
import { ProtocolAnalyseRequestDto } from '../../common/dto/protocol.analyse.request.dto';

import { nameFromUrl, Puppeteer } from '../../utils';
import { Link } from '../database/entities/link.entity';
import { Protocol } from '../database/entities/protocol.entity';
import { LinkTypeEnum } from '../database/enum/link.type.enum';
import { ChainsRepository } from '../database/repositories/chains.repo';
import { GithubFilesRepository } from '../database/repositories/github.files.repo';
import { LinksRepository } from '../database/repositories/links.repo';
import { ProtocolChainRepository } from '../database/repositories/protocol.chain.repo';
import { ProtocolsRepository } from '../database/repositories/protocols.repo';
import { TasksAbortChecker } from '../services/tasks.abort.checker';
import { FilteredLinks } from './interfaces/protocol.interface';
import {
  PARSE_GITHUB_LINKS_PARALLEL_LIMIT,
  PROTOCOL_PROCESS_PARALLEL_LIMIT,
} from './protocols.constant';
import { ContractsService } from './services/contracts.service';
import { GithubService } from './services/github.service';
import { AppPageStrategy, MainPageStrategy } from './strategies';
import { AbstractStrategy } from './strategies/abstract.strategy';

@Injectable()
export class ProtocolService {
  readonly testRun: boolean;
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
    private readonly configService: ConfigService,
    private readonly tasksAbortChecker: TasksAbortChecker,
  ) {
    this.testRun = JSON.parse(configService.get('TEST_RUN'));
  }

  async parseProtocolsMainPage() {
    this.logger.log('parseProtocolsMainPage started');
    let skip = 0;
    await doWhilst(
      async () => this.protocolsRepo.findAllLimit(skip),
      async (allProtocols) => {
        const protocols = this.testRun ? allProtocols.slice(0, 5) : allProtocols;
        const websites = protocols.map((protocol) => ({ url: protocol.url, protocol }));
        const links = await this.scanWebsitesForLinks(websites, this.mainPageParsingStrategy);
        await this.saveLinks(links);
        skip += allProtocols.length;
        this.logger.debug(`processed [${skip}] websites`);
        return !!allProtocols.length;
      },
    );
    this.logger.log('parseProtocolsMainPage finished');
  }

  async parseProtocolsAppPage(request: CommandRequestDto) {
    this.logger.log('parseProtocolsAppPage started');
    let skip = 0;
    await doWhilst(
      async () =>
        this.protocolsRepo.findWithLinksLimit(LinkTypeEnum.APP, request.includeProcessed, skip),
      async (protocolsWithLinks) => {
        const websites = (
          this.testRun ? protocolsWithLinks.slice(0, 10) : protocolsWithLinks
        ).flatMap((protocol) => protocol.links.map(({ url }) => ({ url, protocol })));
        const links = await this.scanWebsitesForLinks(websites, this.appPageParsingStrategy);
        await this.saveLinks(links);
        await this.linksRepo.setProcessedByUrls(websites.map(({ url }) => url));
        skip += protocolsWithLinks.length;
        this.logger.debug(`processed [${skip}] pages`);
        return !!protocolsWithLinks.length;
      },
    );
    this.logger.log('parseProtocolsAppPage finished');
  }

  async parseProtocolsDocsPage(request: CommandRequestDto) {
    this.logger.log('parseProtocolsDocsPage started');
    let skip = 0;
    await doWhilst(
      async () =>
        this.protocolsRepo.findWithLinksLimit(LinkTypeEnum.DOCS, request.includeProcessed, skip),
      async (listProtocols) => {
        const websites = listProtocols.flatMap((protocol) =>
          protocol.links.map(({ url }) => ({ url, protocol })),
        );
        await this.contractService.scanWebsitesForContracts(websites);
        await this.linksRepo.setProcessedByUrls(websites.map(({ url }) => url));
        skip += listProtocols.length;
        this.logger.debug(`processed [${skip}] pages`);
        return !!listProtocols.length;
      },
    );
    this.logger.log('parseProtocolsDocsPage finished');
  }

  async parseProtocolsGithubPage() {
    this.logger.log('parseProtocolsGithubPage started');
    const allLinks = await this.linksRepo.findGithubLinksWithoutFiles();
    const links = this.testRun ? allLinks.slice(0, 5) : allLinks;
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
        this.tasksAbortChecker.ensureTaskNotAborted();
      }),
      PARSE_GITHUB_LINKS_PARALLEL_LIMIT,
    );
    this.logger.log('parseProtocolsGithubPage finished');
  }

  async fetchAbi() {
    this.logger.log('fetchAbi started');
    await this.contractService.fetchAbiAndAbiCode();
    this.logger.log('fetchAbi finished');
  }

  async crawlHtml() {
    this.logger.log('crawlHtml started');
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
        this.tasksAbortChecker.ensureTaskNotAborted();
      }),
    );
    this.logger.log('crawlHtml finished');
  }

  async parseCustomProtocol(request: ProtocolAnalyseRequestDto) {
    const protocol = await this.ensureProtocolExists(request);
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

  private async ensureProtocolExists(request: ProtocolAnalyseRequestDto): Promise<Protocol> {
    const existingProtocol = await this.protocolsRepo.findOneByUrlWithLinks(request.website);
    if (existingProtocol) {
      return existingProtocol;
    }
    const [protocol] = await this.protocolsRepo.upsertProtocols([
      {
        url: request.website,
        name: request.name || nameFromUrl(request.website),
      },
    ]);
    return protocol;
  }

  private async scanWebsitesForLinks(
    websites: { url: string; protocol: Protocol }[],
    strategy: AbstractStrategy,
  ): Promise<Link[]> {
    this.logger.log('scanWebsitesForLinks started');
    const arraysOfLinks = await parallelLimit(
      websites.map((website) => async () => {
        const links = await this.scanWebsiteForLinks(website, strategy);
        this.tasksAbortChecker.ensureTaskNotAborted();
        return links;
      }),
      PROTOCOL_PROCESS_PARALLEL_LIMIT,
    );
    this.logger.log('scanWebsitesForLinks finished');
    return arraysOfLinks.flat();
  }

  private async scanWebsiteForLinks(
    website: { url: string; protocol: Protocol },
    strategy: AbstractStrategy,
  ): Promise<Link[]> {
    const { url, protocol } = website;
    try {
      this.logger.debug(`scan url: [${url}]`);
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
  }

  private linksFromParsedResult(
    linksMap: FilteredLinks,
    type: LinkTypeEnum,
    protocol: Protocol,
  ): Link[] {
    return Array.from(new Set(linksMap.get(type))).map((url) => ({ url, type, protocol } as Link));
  }
}
