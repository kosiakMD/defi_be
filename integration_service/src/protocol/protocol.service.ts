import { Injectable, NotImplementedException } from '@nestjs/common';

import { ChainIdEnum, ProtocolName } from '../common/enum';

import { IntegrationFeaturesData } from '../integrations/integrations.dto';
import { ProtocolBasicInfo } from './features/features.dto';
import AaveProtocolV2 from './protocols/aaveProtocolV2';
import AutofarmProtocol from './protocols/autofarmProtocol';
import BasicProtocol from './protocols/basicProtocol';
import PancakeProtocolV1 from './protocols/pancakeProtocolV1';
import PangolinProtocol from './protocols/pangolinProtocol';
import QuickswapProtocol from './protocols/quickswapProtocol';
import SpookySwapProtocol from './protocols/spookyswapProtocol';
import SushiswapProtocolV2 from './protocols/sushiswapProtocolV2';
import UniswapProtocolV2 from './protocols/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';

@Injectable()
export class ProtocolService {
  private readonly protocols: BasicProtocol[] = [];

  // TODO: to add a new Protocol just add it at ProtocolModule and at ProtocolService constructor
  constructor(
    private readonly aaveProtocolV2: AaveProtocolV2,
    private readonly autofarmProtocol: AutofarmProtocol,
    private readonly pancakeProtocolV1: PancakeProtocolV1,
    private readonly pangolinProtocol: PangolinProtocol,
    private readonly quickswapProtocol: QuickswapProtocol,
    private readonly spookySwapProtocol: SpookySwapProtocol,
    private readonly sushiswapProtocolV2: SushiswapProtocolV2,
    private readonly uniswapProtocolV2: UniswapProtocolV2,
    private readonly uniswapProtocolV3: UniswapProtocolV3,
  ) {
    this.protocols = [
      aaveProtocolV2,
      autofarmProtocol,
      pancakeProtocolV1,
      pangolinProtocol,
      quickswapProtocol,
      spookySwapProtocol,
      sushiswapProtocolV2,
      uniswapProtocolV2,
      // TODO: Remove uniswap v3 until it's fixed
      // uniswapProtocolV3,
    ];
  }

  public getAllProtocolsInfo(): ProtocolBasicInfo[] {
    return this.protocols.map((protocol) => {
      return protocol.getInfo();
    });
  }

  public getProtocol(): BasicProtocol[] {
    return this.protocols;
  }

  public getProtocolByName(protocolName: ProtocolName): BasicProtocol {
    return this.protocols.find((protocol) => protocol.name === protocolName);
  }

  public async getProtocolFeatures(
    protocolName: ProtocolName,
    addresses: string,
    chainId: ChainIdEnum,
  ): Promise<IntegrationFeaturesData> {
    const protocol = this.getProtocolByName(protocolName);
    if (!protocol) {
      throw new NotImplementedException(`Protocol '${protocolName}' is not supported yet`);
    }

    return await protocol.getAllFeaturesData(addresses, chainId);
  }
}
