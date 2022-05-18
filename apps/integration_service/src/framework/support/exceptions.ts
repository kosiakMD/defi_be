/* eslint-disable max-classes-per-file */
import { IWalletMinimal } from './interfaces';
import { ERC20TokenMinimal } from './interfaces/tokens.common.interface';

export class MissingOpportunityException extends Error {
  constructor(opportunity: IWalletMinimal, chain: number) {
    super(`Missing Opportunity Exception - ${chain}/${opportunity.id}`);
  }
}
export class MissingTokenException extends Error {
  constructor(token: ERC20TokenMinimal, opportunity: IWalletMinimal, chain: number) {
    super(`Failed to find token: ${chain}/${token.address} from pool ${chain}/${opportunity.id}`);
  }
}
