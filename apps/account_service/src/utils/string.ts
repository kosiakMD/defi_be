import { ChainIdEnum } from '@app/common';

export function camelize(...texts: string[]): string {
  let result = '';
  texts.forEach((text, index) => {
    text = text.replace(/[-_\s.]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
    if (index === 0) {
      text = text.substr(0, 1).toLowerCase() + text.substr(1);
    }
    result += text;
  });
  return result;
}

export function concatStrings(...args): string {
  return args.join('_');
}

export function getJobPlaceholder(chain: ChainIdEnum, feature: string, protocol: string): string {
  return concatStrings(chain, protocol, feature);
}
