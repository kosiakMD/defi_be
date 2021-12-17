import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainAbbrEnum } from '@app/common';

import { MulticallService } from './multicall.service';

@Injectable()
export class MulticallProvider {
  private multicallsMap: Map<ChainAbbrEnum, MulticallService> = new Map<
    ChainAbbrEnum,
    MulticallService
  >();

  constructor(private readonly configService: ConfigService) {
    this.createMulticallServices();
  }

  private createMulticallServices() {
    const providersData: Record<string, { rpcConfigPath; multicallAddress }> = {
      [ChainAbbrEnum.eth]: {
        rpcConfigPath: 'ETH_URL',
        multicallAddress: '0x255f2a7712cc06944aeef4ea78349c54c22ffe1f',
      },
      [ChainAbbrEnum.bsc]: {
        rpcConfigPath: 'BSC_URL',
        multicallAddress: '0x1ee38d535d541c55c9dae27b12edf090c608e6fb',
      },
      [ChainAbbrEnum.plg]: {
        rpcConfigPath: 'POLYGON_URL',
        multicallAddress: '0xa1b2b503959aedd81512c37e9dce48164ec6a94d',
      },
      [ChainAbbrEnum.ftm]: {
        rpcConfigPath: 'FTM_URL',
        multicallAddress: '0x11473d6e641df17cd6331d45b135e35b49edbea8',
      },
      [ChainAbbrEnum.avax]: {
        rpcConfigPath: 'AVAX_URL',
        multicallAddress: '0x92a09557707ab4888eacc034122120f27362da7f',
      },
      [ChainAbbrEnum.harm]: {
        rpcConfigPath: 'HARM_URL',
        multicallAddress: '0x34b415f4d3b332515e66f70595ace1dcf36254c5',
      },
    };
    Object.entries(providersData).forEach(([chainAbbr, config]) => {
      this.multicallsMap.set(
        chainAbbr as ChainAbbrEnum,
        new MulticallService(
          new Web3(this.configService.get<string>(config.rpcConfigPath)),
          config.multicallAddress,
        ),
      );
    });
  }

  getForChain(chain: ChainAbbrEnum): MulticallService {
    return this.multicallsMap.get(chain);
  }
}
