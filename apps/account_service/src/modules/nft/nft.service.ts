import { Injectable, NotImplementedException } from '@nestjs/common';

import { Address, NftProjectEnum } from '@app/common';
import { ChainIdToAbbr } from '@app/common/constant/dictionaries';
import { NftAssetsByAccounts, NftServiceInfo } from '@app/common/interfaces/nft.interface';

import { AavegotchiService } from './aavegotchi.service';
import { NftAbstractService } from './nft.abstract.service';
import { OpenSeaService } from './open.sea.service';

@Injectable()
export class NftService {
  private readonly projects: NftAbstractService[] = [];

  constructor(
    private readonly openSeaService: OpenSeaService,
    private readonly aavegotchiService: AavegotchiService,
  ) {
    this.projects = [this.openSeaService, this.aavegotchiService];
  }

  private getAllProjectsInfo(): NftServiceInfo[] {
    return this.projects.map((project) => project.getInfo());
  }

  private getProjectByName(projectName: NftProjectEnum): NftAbstractService {
    return this.projects.find(({ project }) => project === projectName);
  }

  public getProjects(): NftServiceInfo[] {
    return this.getAllProjectsInfo();
  }

  public async getAssets(
    projectName: NftProjectEnum,
    addresses: Address[],
    chains: number[],
  ): Promise<NftAssetsByAccounts> {
    const project = this.getProjectByName(projectName);

    if (!project) {
      throw new NotImplementedException(`NFT project ${projectName} is not supported yet`);
    }

    const allowedChains = [...new Set(chains)].filter((chain) =>
      project.getInfo().chains?.includes(ChainIdToAbbr[chain]),
    );

    if (!allowedChains.length) {
      throw new NotImplementedException(
        `Project '${projectName}' doesn't support any of these chains: ${chains.join(', ')}`,
      );
    }

    return project.getAssetsByAccounts(addresses, allowedChains);
  }
}
