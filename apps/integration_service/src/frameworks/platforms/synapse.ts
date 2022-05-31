import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { FeatureEnum } from '../support/enums';
import { SynapseLiquidity } from '../support/evm/protocols/liquidity/synapse-liquidity';
import { SynapseStaking } from '../support/evm/protocols/yield/synapse-staking';
import { RootPlatform } from '../support/root-platform';

export class Synapse extends RootPlatform {
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
        url: 'https://synapseprotocol.com/',
        logo: 'https://icons.llama.fi/synapse.png',
        twitter: 'SynapseProtocol',
      },
    });

    await this.registerProtocol(SynapseStaking, {
      chain: ChainIdEnum.bnb,
      name: 'Synapse',
      feature: FeatureEnum.staking,
      address: '0x8f5bbb2bb8c2ee94639e55d5f41de9b4839c1280',
      context: { rewardToken: '0xa4080f1778e69467E905B8d6F72f6e441f9e9484' },
    });

    await this.registerProtocol(SynapseLiquidity, {
      chain: ChainIdEnum.bnb,
      name: 'Synapse',
      feature: FeatureEnum.pools,
      address: '0x8f5bbb2bb8c2ee94639e55d5f41de9b4839c1280',
    });

    await this.registerProtocol(SynapseStaking, {
      chain: ChainIdEnum.avax,
      name: 'Synapse',
      feature: FeatureEnum.staking,
      address: '0x3a01521F8E7F012eB37eAAf1cb9490a5d9e18249',
      context: { rewardToken: '0x1f1E7c893855525b303f99bDF5c3c05Be09ca251' },
    });

    await this.registerProtocol(SynapseLiquidity, {
      chain: ChainIdEnum.avax,
      name: 'Synapse',
      feature: FeatureEnum.pools,
      address: '0x3a01521F8E7F012eB37eAAf1cb9490a5d9e18249',
    });

    await this.registerProtocol(SynapseStaking, {
      chain: ChainIdEnum.arbi,
      name: 'Synapse',
      feature: FeatureEnum.staking,
      address: '0x73186f2Cf2493f20836b17b21ae79fc12934E207',
      context: { rewardToken: '0x080F6AEd32Fc474DD5717105Dba5ea57268F46eb' },
    });

    await this.registerProtocol(SynapseLiquidity, {
      chain: ChainIdEnum.arbi,
      name: 'Synapse',
      feature: FeatureEnum.pools,
      address: '0x73186f2Cf2493f20836b17b21ae79fc12934E207',
    });

    await this.registerProtocol(SynapseStaking, {
      chain: ChainIdEnum.boba,
      name: 'Synapse',
      feature: FeatureEnum.staking,
      address: '0xd5609cD0e1675331E4Fb1d43207C8d9D83AAb17C',
      context: { rewardToken: '0xb554A55358fF0382Fb21F0a478C3546d1106Be8c' },
    });

    await this.registerProtocol(SynapseLiquidity, {
      chain: ChainIdEnum.boba,
      name: 'Synapse',
      feature: FeatureEnum.pools,
      address: '0xd5609cD0e1675331E4Fb1d43207C8d9D83AAb17C',
    });

    await this.registerProtocol(SynapseStaking, {
      chain: ChainIdEnum.eth,
      name: 'Synapse',
      feature: FeatureEnum.staking,
      address: '0xd10eF2A513cEE0Db54E959eF16cAc711470B62cF',
      context: { rewardToken: '0x0f2D719407FdBeFF09D87557AbB7232601FD9F29' },
    });

    await this.registerProtocol(SynapseLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Synapse',
      feature: FeatureEnum.pools,
      address: '0xd10eF2A513cEE0Db54E959eF16cAc711470B62cF',
    });

    await this.registerProtocol(SynapseStaking, {
      chain: ChainIdEnum.ftm,
      name: 'Synapse',
      feature: FeatureEnum.staking,
      address: '0xaeD5b25BE1c3163c907a471082640450F928DDFE',
      context: { rewardToken: '0xE55e19Fb4F2D85af758950957714292DAC1e25B2' },
    });

    await this.registerProtocol(SynapseLiquidity, {
      chain: ChainIdEnum.ftm,
      name: 'Synapse',
      feature: FeatureEnum.pools,
      address: '0xaeD5b25BE1c3163c907a471082640450F928DDFE',
    });

    // TODO: it is necessary to additionally explore the method of obtaining contracts abi on the Harmony chain
    // await this.registerProtocol(SynapseStaking, {
    //   chain: ChainIdEnum.harm,
    //   name: 'Synapse',
    //   feature: FeatureEnum.staking,
    //   address: '0xaeD5b25BE1c3163c907a471082640450F928DDFE',
    //   context: { rewardToken: '0xE55e19Fb4F2D85af758950957714292DAC1e25B2' },
    // });
    //
    // await this.registerProtocol(SynapseLiquidity, {
    //   chain: ChainIdEnum.harm,
    //   name: 'Synapse',
    //   feature: FeatureEnum.pools,
    //   address: '0xaeD5b25BE1c3163c907a471082640450F928DDFE',
    // });

    await this.registerProtocol(SynapseStaking, {
      chain: ChainIdEnum.opt,
      name: 'Synapse',
      feature: FeatureEnum.staking,
      address: '0xe8c610fcb63A4974F02Da52f0B4523937012Aaa0',
      context: { rewardToken: '0x5A5fFf6F753d7C11A56A52FE47a177a87e431655' },
    });

    await this.registerProtocol(SynapseLiquidity, {
      chain: ChainIdEnum.opt,
      name: 'Synapse',
      feature: FeatureEnum.pools,
      address: '0xe8c610fcb63A4974F02Da52f0B4523937012Aaa0',
    });

    await this.registerProtocol(SynapseStaking, {
      chain: ChainIdEnum.plg,
      name: 'Synapse',
      feature: FeatureEnum.staking,
      address: '0x7875Af1a6878bdA1C129a4e2356A3fD040418Be5',
      context: { rewardToken: '0xf8F9efC0db77d8881500bb06FF5D6ABc3070E695' },
    });

    await this.registerProtocol(SynapseLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Synapse',
      feature: FeatureEnum.pools,
      address: '0x7875Af1a6878bdA1C129a4e2356A3fD040418Be5',
    });
  }
}
