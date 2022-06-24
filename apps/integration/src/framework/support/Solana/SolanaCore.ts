import { RootProtocolCacheable } from '../RootProtocolCacheable';
import { IProtocolMeta, IWalletMinimal, IWalletOpportunity, IWalletUserEntry } from '../interfaces';

export abstract class SolanaCore<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TProtocolMeta extends IProtocolMeta = IProtocolMeta,
> extends RootProtocolCacheable<TMinimalType, TOpportunityType, TUserEntryType, TProtocolMeta> {
  //
}
