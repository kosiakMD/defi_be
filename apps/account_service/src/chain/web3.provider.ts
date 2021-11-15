import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '@app/common/enum';

import { MulticallContract } from './contracts/multicall.contract';

@Injectable()
export class Web3Provider {
  private readonly providers = {};
  private readonly multicalls = {};

  constructor(private readonly configService: ConfigService) {
    this.providers[ChainIdEnum.eth] = new Web3(this.configService.get<string>('ETH_URL'));
    this.providers[ChainIdEnum.bsc] = new Web3(this.configService.get<string>('BSC_URL'));
    this.providers[ChainIdEnum.plg] = new Web3(this.configService.get<string>('POLYGON_URL'));
    this.providers[ChainIdEnum.ftm] = new Web3(this.configService.get<string>('FTM_URL'));
    this.providers[ChainIdEnum.avax] = new Web3(this.configService.get<string>('AVAX_URL'));

    // todo: move to config
    this.multicalls[ChainIdEnum.eth] = new MulticallContract(
      this.providers[ChainIdEnum.eth],
      '0x255f2a7712cc06944aeef4ea78349c54c22ffe1f',
    );
    this.multicalls[ChainIdEnum.bsc] = new MulticallContract(
      this.providers[ChainIdEnum.bsc],
      '0x1ee38d535d541c55c9dae27b12edf090c608e6fb',
    );
    this.multicalls[ChainIdEnum.plg] = new MulticallContract(
      this.providers[ChainIdEnum.plg],
      '0xa1b2b503959aedd81512c37e9dce48164ec6a94d',
    );
    this.multicalls[ChainIdEnum.ftm] = new MulticallContract(
      this.providers[ChainIdEnum.ftm],
      '0x11473d6e641df17cd6331d45b135e35b49edbea8',
    );
    this.multicalls[ChainIdEnum.avax] = new MulticallContract(
      this.providers[ChainIdEnum.avax],
      '0x92a09557707ab4888eacc034122120f27362da7f',
    );
  }

  public web3(chain: ChainIdEnum): Web3 {
    return this.providers[chain];
  }

  public multicall(chain: ChainIdEnum): MulticallContract {
    return this.multicalls[chain];
    this.providers[ChainIdEnum.xdai] = new Web3(this.configService.get<string>('XDAI_URL'));
    this.providers[ChainIdEnum.celo] = new Web3(this.configService.get<string>('CELO_URL'));
    this.providers[ChainIdEnum.mriver] = new Web3(this.configService.get<string>('MRIVER_URL'));
    this.providers[ChainIdEnum.harm] = new Web3(this.configService.get<string>('HARM_URL'));
    this.providers[ChainIdEnum.heco] = new Web3(this.configService.get<string>('HECO_URL'));
  }

  public getInstanceByChainId(chain: ChainIdEnum): Web3 {
    return this.providers[chain];
  }
}
