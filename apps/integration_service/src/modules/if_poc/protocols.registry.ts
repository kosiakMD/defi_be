import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { AbiFetcher } from './abi.fetcher';
import { FeatureFactory } from './feature.factory';
import { ProtocolsClassifier } from './protocols.classifier';

@Injectable()
export class ProtocolsRegistry {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly abiFetcher: AbiFetcher,
    private readonly protocolsClassifier: ProtocolsClassifier,
    private readonly featureFactory: FeatureFactory,
  ) {}

  async registerProtocol(chainCode, protocol, cfg): Promise<void> {
    //fetch ABI for the protocol by provided cfg
    const abi = await this.abiFetcher.fetchAbi(cfg);

    //classify protocol based on known features
    const classificationResult = await this.protocolsClassifier.classifyProtocol(cfg, abi);

    //iterate over classified features and fetch metadata for each one
    for (const feature of classificationResult.features) {
      const featureInstance = this.featureFactory.createFeature(feature, cfg);
      await featureInstance.updateMetadata();
    }
    this.logger.debug(
      `processed protocol with features: protocol=${protocol}, features=${classificationResult.features}`,
    );
    //it is assumed that each protocol has list of supported features with fetched metadata
  }
}
