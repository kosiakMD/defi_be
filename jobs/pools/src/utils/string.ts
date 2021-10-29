import { ChainIdEnum } from '../config/enum';

export function concatStrings(...args): string {
  return args.join('_');
}

export function getJobPlaceholder(chain: ChainIdEnum, feature: string, protocol: string): string {
  return concatStrings(chain, protocol, feature);
}
