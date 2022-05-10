import crypto from 'crypto';

import { Logger } from '@app/common';
import { getChainById } from '@app/common/utils';

import { AccountService } from '../../modules/microservices/account.service';
import { PriceService } from '../../modules/microservices/price.service';
import { IFeatureMeta, IProtocolMeta, IRootProtocol } from './interfaces';

/**
 * Common Protocol Base. This is to be used cross-chain
 * so don't implement EVM specific solutions here, better to do higher up
 */
export abstract class RootProtocol<TProtocolMeta extends IProtocolMeta = IProtocolMeta>
  implements IRootProtocol<TProtocolMeta>
{
  meta: TProtocolMeta;
  protected abstract logger: Logger;
  // TODO: use new asset service :)
  protected abstract accountService: AccountService;
  protected abstract priceService: PriceService;

  /**
   * Protocol specific metadata
   */
  getMeta(): IFeatureMeta {
    return {
      chain: getChainById(this.meta.chain),
      list: [this.meta.feature],
    };
  }

  public registerMeta(meta: TProtocolMeta) {
    this.meta = meta;
  }

  /**
   * generates a unique ID per protocol to be
   * used with cacheing the protocols pool list
   * (individual pools should be cached by there
   * predictable ID so that lookups are easier)
   */
  get protocolId() {
    const hash = crypto
      .createHash('sha256') //
      .update(JSON.stringify(this.meta))
      .digest('hex'); // digest('base64')

    return `${this.constructor.name}_${this.meta.chain}_${hash}`;
  }
}
