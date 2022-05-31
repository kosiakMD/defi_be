import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';

import {
  ILidoEVMMeta,
  LidoStaking as EVMLidoStaking,
} from '../support/EVM/protocols/Yield/LidoStaking';
import { RootPlatform } from '../support/RootPlatform';
import {
  ILidoSolanaMeta,
  LidoStaking as SolanaLidoStaking,
} from '../support/Solana/protocols/Yield/LidoStaking';
import { FeatureEnum } from '../support/enums';

export class Lido extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register() {
    this.registerMeta({
      name: this.constructor.name,
      slug: this.constructor.name,
      links: {
        url: 'https://lido.fi/',
        logo: 'https://icons.llama.fi/lido.png',
        twitter: 'LidoFinance',
      },
    });

    /**
     * Website: https://lido.fi/
     * Docs: https://docs.lido.fi/
     * Staking Contract: https://etherscan.io/address/0xae7ab96520de3a18e5e111b5eaab095312d7fe84
     * Deposit TX: unknown
     */
    await this.registerProtocol<ILidoEVMMeta>(EVMLidoStaking, {
      chain: ChainIdEnum.eth,
      name: 'Lido',
      feature: FeatureEnum.staking,
      address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', // proxy
      context: {
        stakedToken: ZERO_ADDRESS, // native eth
        statsApi: 'https://stake.lido.fi/api/steth-apr',
        statsProcessor: (data: number) => data / 100,
      },
    });

    /**
     * Website: https://lido.fi/kusama
     * Docs: unknown
     * Staking Contract: https://moonriver.moonscan.io/address/0xffc7780c34b450d917d557e728f033033cb4fa8c
     * Deposit TX: unknown
     */
    await this.registerProtocol<ILidoEVMMeta>(EVMLidoStaking, {
      chain: ChainIdEnum.mriver,
      name: 'Lido',
      feature: FeatureEnum.staking,
      address: '0xffc7780c34b450d917d557e728f033033cb4fa8c', // proxy
      context: {
        stakedToken: '0xffffffff1fcacbd218edc0eba20fc2308c778080', // xcKSM
        statsApi: 'https://kusama.lido.fi/api/stats/',
        statsProcessor: (data: any): number => data.APR / 100000,
      },
    });

    /**
     * Website: https://lido.fi/polygon
     * Docs: unknown
     * Staking Contract: unknown
     * Deposit TX: unknown
     *
     * @todo Coming Soon
     * For some reason all the deployed addresses for matic/polygon are on eth mainnet...
     * https://github.com/Shard-Labs/PoLido/blob/main/mainnet-deployment-info.json
     */
    // await this.registerProtocol(EVMLidoStaking, {
    //   chain: ChainIdEnum.plg,
    //   name: 'Lido',
    //   feature: FeatureEnum.staking,
    //   address: '', // proxy
    //   data: {
    //     // native eth
    //     stakedToken: '',
    //   },
    // });

    /**
     * Website: https://lido.fi/solana
     * Docs: https://docs.solana.lido.fi/
     * Staking Contract: https://solanabeach.io/address/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj
     * Deposit TX: https://solanabeach.io/tx/n6FpfeiXtsZEE2ZRVEgjbJ5WwpLWLHYD9fUW4WP2BxGnjpwfQdbbATTFro4kvBSicQz1o56ZUUEuJTkUxWLsbkV
     */
    await this.registerProtocol<ILidoSolanaMeta>(SolanaLidoStaking, {
      chain: ChainIdEnum.sol,
      name: 'Lido',
      feature: FeatureEnum.staking,
      address: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', // stSol
      context: {
        program: '49Yi1TKkNyYjPAFdR9LBvoHcUjuPX4Df5T5yv39w2XTn',
        // wrapped solana, should be actual native solana though
        stakedToken: '11111111111111111111111111111111',
        statsApi: 'https://solana.lido.fi/api/stats',
        statsProcessor: (data: any): number => data.apr / 100,
      },
    });
  }
}
