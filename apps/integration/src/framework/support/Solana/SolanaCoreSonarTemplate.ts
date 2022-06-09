import { RootProtocolCacheable } from '../RootProtocolCacheable';
import { IProtocolMeta, IWalletMinimal, IWalletOpportunity, IWalletUserEntry } from '../interfaces';

export abstract class SolanaCoreSonarTemplate<
  TMinimal extends IWalletMinimal,
  TOpportunity extends IWalletOpportunity,
  TUserEntry extends IWalletUserEntry,
  TProtocol extends IProtocolMeta = IProtocolMeta,
> extends RootProtocolCacheable<TMinimal, TOpportunity, TUserEntry, TProtocol> {
  //
}
