import { parallelLimit, series } from 'async';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Puppeteer } from '../../utils';
import { Link } from '../database/entities/link.entity';
import { Protocol } from '../database/entities/protocol.entity';
import { LinkTypeEnum } from '../database/enum/link.type.enum';
import { ChainsRepository } from '../database/repositories/chains.repo';
import { GithubFilesRepository } from '../database/repositories/github.files.repo';
import { LinksRepository } from '../database/repositories/links.repo';
import { ProtocolChainRepository } from '../database/repositories/protocol.chain.repo';
import { ProtocolsRepository } from '../database/repositories/protocols.repo';
import { FilteredLinks, IListProtocol } from './interfaces/protocol.interface';
import { PARSE_GITHUB_LINKS_PARALLEL_LIMIT } from './protocols.constant';
import { ContractsService } from './services/contracts.service';
import { GithubService } from './services/github.service';
import { MainPageStrategy } from './strategies';

//number of websites of protocols to be parsed in parallel
const PROTOCOL_PROCESS_PARALLEL_LIMIT = 3;

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
    private readonly contractService: ContractsService,
    private readonly githubService: GithubService,
  ) {}

  async parseGithubLinks() {
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

  async parseProtocols() {
    //fetch protocols to process
    const protocolsToProcess: Protocol[] = await this.protocolsRepo.findWithoutLinks();

    //scan sites for the links
    const links: Link[] = await this.scanProtocolsForLinks(protocolsToProcess);

    //save links
    await this.linksRepo.save(links);
  }

  async run(listProtocols?: IListProtocol[]) {
    //fetch protocols to process
    const protocolsToProcess: Protocol[] = await this.getProtocolsToProcess(listProtocols);

    //scan sites for the links
    const links: Link[] = await this.scanProtocolsForLinks(protocolsToProcess);

    //save links
    await this.saveLinks(links);

    const listChains = await this.chainsRepo.upsertChainsSync(listProtocols.map((lp) => lp.chain));
    const protocolChain = [];
    for (const protocol of protocolsToProcess) {
      protocolChain.push(
        ...(await this.protocolChainRepo.upsertProtocolChainsSync(protocol, listChains)),
      );
    }

    const mappedChainProtocolList = new Map(
      listProtocols.map((lp) => [
        lp.protocol,
        protocolChain.find(
          (lc) => lc?.chain?.name === lp?.chain && lc?.protocol?.url === lp?.protocol,
        ),
      ]),
    );

    await this.contractService.run(links, mappedChainProtocolList);
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

  private async saveLinks(links: Link[]) {
    try {
      const listFound = await this.linksRepo.find({
        where: links.map((l) => ({
          url: l?.url,
          type: l?.type,
          protocol: l?.protocol?.id,
        })),
      });
      const sortBy = new Map(listFound.map((l) => [l.url, l]));
      const filteredLinks = links.filter((l) => (!sortBy.has(l.url) ? l : ''));
      await this.linksRepo.save(filteredLinks);
    } catch (e) {
      this.logger.error(`Save links in DB error: ${e.message}`);
    }
  }

  private async getProtocolsToProcess(protocolsUrls?: IListProtocol[]): Promise<Protocol[]> {
    const listProtocols = protocolsUrls?.map((lp) => lp.protocol);
    return !listProtocols
      ? //if no urls are provided, try to fetch protocols from DB which don't have any links
        await this.protocolsRepo.findWithLinks()
      : //if any urls are provided - try to find protocols by urls without any links
        await series(
          listProtocols.map((url: string) => async () => {
            return (
              (await this.protocolsRepo.findOneByUrlWithLinks(url)) ||
              (await this.protocolsRepo.save({ url, name: new URL(url).hostname, links: [] }))
            );
          }),
        );
  }

  private async scanProtocolsForLinks(protocols: Protocol[]): Promise<Link[]> {
    this.logger.debug('scanProtocolsForLinks started');
    const arraysOfLinks = await parallelLimit(
      protocols.map((p) => async () => {
        try {
          this.logger.debug(`mainPageParsingStrategy.parsing: ${p.url}`);
          const [, linksMap] = await this.mainPageParsingStrategy.parsing({
            url: p.url,
            name: p.name,
          });
          return [
            ...this.linksFromParsedResult(linksMap, LinkTypeEnum.APP, p),
            ...this.linksFromParsedResult(linksMap, LinkTypeEnum.GITHUB, p),
            ...this.linksFromParsedResult(linksMap, LinkTypeEnum.DOCS, p),
          ];
        } catch (e) {
          this.logger.error(`.mainPageParsingStrategy.parsing error: ${e.message}`);
        }
      }),
      PROTOCOL_PROCESS_PARALLEL_LIMIT,
    );
    this.logger.debug('scanProtocolsForLinks finished');
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
