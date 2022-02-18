import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { concatStrings } from '@app/common/utils';

import { AbiFetcher } from './abi.fetcher';
import { DataHolder } from './data.holder';
import { FeatureFactory } from './feature.factory';
import { ProtocolsClassifier } from './protocols.classifier';

@Injectable()
export class ProtocolsRegistry {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly abiFetcher: AbiFetcher,
    private readonly protocolsClassifier: ProtocolsClassifier,
    private readonly featureFactory: FeatureFactory,
    private readonly dataHolder: DataHolder,
  ) {}

  async registerProtocol(chainCode, protocol, cfg): Promise<void> {
    //fetch ABI for the protocol by provided cfg
    const abi = await this.abiFetcher.fetchAbi(cfg);

    const storageKey = this.generateKey(chainCode, protocol);
    const protocolInfo = {
      ...cfg,
      chainCode,
      protocol,
      abi,
      features: [],
    };

    //put information into data holder
    await this.dataHolder.set(storageKey, protocolInfo);

    //classify protocol based on known features
    const classificationResult = await this.protocolsClassifier.classifyProtocol({
      ...cfg,
      abi,
    });

    //iterate over classified features and fetch metadata for each one
    for (const feature of classificationResult.features) {
      const featureInstance = this.featureFactory.createFeature(feature);
      protocolInfo.metadata = await featureInstance.updateMetadata(protocolInfo);
      protocolInfo.features.push(feature);
    }
    //update information into data holder
    await this.dataHolder.set(storageKey, protocolInfo);

    this.logger.debug(
      `processed protocol with features: protocol=${protocol}, features=${classificationResult.features}`,
    );
    // console.log(JSON.stringify(protocolInfo, null, 4));
    //it is assumed that each protocol has list of supported features with fetched metadata
  }

  async getUserData(chainCode, protocol, address) {
    const storageKey = this.generateKey(chainCode, protocol);
    const protocolInfo = await this.dataHolder.get(storageKey);
    const userInfo = {};
    //iterate over protocol features and fetch userData for each one
    for (const feature of protocolInfo.features) {
      const featureInstance = this.featureFactory.createFeature(feature);
      userInfo[feature] = await featureInstance.getUserData(protocolInfo, address);
    }
    return userInfo;
  }

  generateKey(chainCode, protocol) {
    return concatStrings(chainCode, protocol);
  }
}
