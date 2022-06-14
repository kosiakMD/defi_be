/* eslint-disable max-classes-per-file */
import type { RootProtocol } from './RootProtocol';
import type { IWalletMinimal } from './interfaces';
import type { ERC20TokenMinimal } from './interfaces/tokens.common.interface';

/**
 * Failed to find any opportunitiy data
 */
export class MissingOpportunityException extends Error {
  constructor(opportunity: IWalletMinimal, chain: number) {
    super(`Missing Opportunity Exception - ${chain}/${opportunity.id}`);
  }
}

/**
 * Failed to get token info, or price
 */
export class MissingTokenException extends Error {
  constructor(token: ERC20TokenMinimal, opportunity: IWalletMinimal, chain: number) {
    super(`Failed to find token: ${chain}/${token?.address} from pool ${chain}/${opportunity.id}`);
  }
}

/**
 * Underlying tokens are absent or wrong
 */
export class MissingUnderlyingException extends Error {
  constructor(token: ERC20TokenMinimal, chain: number) {
    super(`Failed to to find underlying tokens for lp token: ${chain}/${token?.address}`);
  }
}

/**
 * Failed to get minimal cacheable pool data
 */
export class FailedCacheDataException extends Error {
  constructor(protocol: RootProtocol) {
    super(
      `Failed to get minimal cacheable pool list: ${protocol.meta.name} (Chain: ${protocol.meta.chain})`,
    );
  }
}
