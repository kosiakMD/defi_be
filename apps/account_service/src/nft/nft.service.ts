import { Injectable, NotImplementedException } from '@nestjs/common';

import { Address, NftProjectEnum } from '@app/common';
import { ChainIdToAbbr } from '@app/common/constant/dictionaries';
import { NftAssetsByAccounts, NftServiceInfo } from '@app/common/interfaces/nft.interface';

import { AbstractNftService } from './abstract.nft.service';
import { AavegotchiService } from './projects/aavegotchi/aavegotchi.service';
import { OpenSeaService } from './projects/open_sea/open.sea.service';

@Injectable()
export class NftService {
  private readonly projects: AbstractNftService[] = [];

  constructor(
    private readonly openSeaService: OpenSeaService,
    private readonly aavegotchiService: AavegotchiService,
  ) {
    this.projects = [this.openSeaService, this.aavegotchiService];
  }

  private getAllProjectsInfo(): NftServiceInfo[] {
    return this.projects.map((project) => project.getInfo());
  }

  private getProjectByName(projectName: NftProjectEnum): AbstractNftService {
    return this.projects.find(({ project }) => project === projectName);
  }

  public getProjects(): NftServiceInfo[] {
    return this.getAllProjectsInfo();
  }

  public async getAssets(
    projectName: NftProjectEnum,
    addresses: Address[],
    chains: number[],
    limit: number,
    offset: number,
  ): Promise<NftAssetsByAccounts> {
    const project = this.getProjectByName(projectName);

    if (!project) {
      throw new NotImplementedException(`NFT project ${projectName} is not supported yet`);
    }

    const allowedChains = chains.filter((chain) =>
      project.getInfo().chains?.includes(ChainIdToAbbr[chain]),
    );

    if (!allowedChains.length) {
      throw new NotImplementedException(
        `Project '${projectName}' doesn't support any of these chains: ${chains.join(', ')}`,
      );
    }

    return project.getAssetsByAccounts(addresses, allowedChains, limit, offset);
  }
}
