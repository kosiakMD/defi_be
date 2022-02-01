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
      [ChainAbbrEnum.arbi]: {
        rpcConfigPath: 'ARBITRUM_URL',
        multicallAddress: '0xAb16069D3E9E352343B2040ce7d7715C585994f9',
      },
      [ChainAbbrEnum.cro]: {
        rpcConfigPath: 'CRONOS_URL',
        multicallAddress: '0x8cCB17c781A886c1e9e4b7128C12A41A53d9E4E1',
      },
      [ChainAbbrEnum.heco]: {
        rpcConfigPath: 'HECO_URL',
        multicallAddress: '0x2bC9D53e7734913587f791389444119B90698037',
      },
      [ChainAbbrEnum.mriver]: {
        rpcConfigPath: 'MRIVER_URL',
        multicallAddress: '0x270f2F35bED92B7A59eA5F08F6B3fd34c8D9D9b5',
      },
      [ChainAbbrEnum.okex]: {
        rpcConfigPath: 'OKEX_URL',
        multicallAddress: '0x11e14AEABbCD1774B37C4EE5E1aD3c831ACc2A2c',
      },
      [ChainAbbrEnum.celo]: {
        rpcConfigPath: 'CELO_URL',
        multicallAddress: '0xBc107e7E5e68Fc92E76A002381347846fD03F1C6',
      },
      [ChainAbbrEnum.near]: {
        rpcConfigPath: 'AURORA_URL',
        multicallAddress: '0x32b50c286DEFd2932a0247b8bb940b78c063F16c',
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
