import { Injectable, NotImplementedException } from '@nestjs/common';

import { IntegrationFeaturesDataDto, ProtocolName } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';

import { ProtocolBasicInfo } from './features/features.dto';
import AaveProtocolV2 from './protocols/aaveProtocolV2';
import AutofarmProtocol from './protocols/autofarmProtocol';
import SpookySwapProtocol from './protocols/spookyswapProtocol';
import PangolinProtocol from './protocols/uniswapLike/pangolinProtocol';
import QuickswapProtocol from './protocols/uniswapLike/quickswapProtocol';
import SushiswapProtocolV2 from './protocols/uniswapLike/sushiswapProtocolV2';
import UniswapLikeProtocol from './protocols/uniswapLike/uniswapLikeProtocol';
import UniswapProtocolV2 from './protocols/uniswapLike/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';

@Injectable()
export class ProtocolService {
  private readonly protocols: UniswapLikeProtocol[] = [];

  // TODO: to add a new Protocol just add it at ProtocolModule and at ProtocolService constructor
  constructor(
    private readonly aaveProtocolV2: AaveProtocolV2,
    private readonly uniswapProtocolV2: UniswapProtocolV2,
    private readonly uniswapProtocolV3: UniswapProtocolV3,
    private readonly sushiswapProtocolV2: SushiswapProtocolV2,
    private readonly pangolinProtocol: PangolinProtocol,
    private readonly quickswapProtocol: QuickswapProtocol,
    private readonly autofarmProtocol: AutofarmProtocol,
    private readonly spookySwapProtocol: SpookySwapProtocol,
  ) {
    this.protocols = [
      aaveProtocolV2,
      autofarmProtocol,
      pangolinProtocol,
      quickswapProtocol,
      spookySwapProtocol,
      sushiswapProtocolV2,
      uniswapProtocolV2,
      uniswapProtocolV3,
    ];
  }

  public getAllProtocolsInfo(): ProtocolBasicInfo[] {
    return this.protocols.map((protocol) => {
      return protocol.getInfo();
    });
  }

  public getProtocol(): UniswapLikeProtocol[] {
    return this.protocols;
  }

  public getProtocolByName(protocolName: ProtocolName): UniswapLikeProtocol {
    return this.protocols.find((protocol) => protocol.name === protocolName);
  }

  public async getProtocolFeatures(
    protocolName: ProtocolName,
    addresses: string,
    chainId: ChainIdEnum,
  ): Promise<IntegrationFeaturesDataDto> {
    const protocol = this.getProtocolByName(protocolName);
    if (!protocol) {
      throw new NotImplementedException(`Protocol '${protocolName}' is not supported yet`);
    }
    return await protocol.getAllFeaturesData(addresses, chainId);
  }
}
