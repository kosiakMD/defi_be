import { chunk } from './array';

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

// TODO: Warning:(16, 26) Unnecessary non-capturing group '(?:^\w|[A-Z]|\b\w|\s+)'
export function toCamelCase(string: string): string {
  return string.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match: string, index: number): string {
    if (+match === 0) return '';
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

export function capitalizeFirstLetter(string: string): string {
  return string[0].toUpperCase() + string.slice(1);
}

export function splitToArray(value: string | string[]): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }

  return value.split(',');
}

export const getKey = (...seed: Array<string | number>): string => seed.join('_');

export function concatStrings(...args): string {
  return args.join('_');
}

export function objToString(object) {
  const stringValues = {};
  Object.keys(object).forEach((k) => {
    stringValues[k] = object[k].toString();
  });
  return stringValues;
}

export function splitToNumberArray(value: string): number[] {
  return splitToArray(value).map((item) => Number(item));
}

export const startsWith = (name: string, beginning: string): boolean => {
  return name.toLowerCase().startsWith(beginning.toLowerCase());
};
export const endsWith = (name: string, end: string): boolean => {
  return name.toLowerCase().endsWith(end.toLowerCase());
};

export const regex = (name: string, regex: RegExp): RegExpMatchArray => {
  return name.toLowerCase().match(regex);
};

export const equals = (nameOne: string, nameTwo: string): boolean => {
  return nameOne.toLowerCase() === nameTwo.toLowerCase();
};

export const stringToHex = (string: string) =>
  string
    .split('')
    .map((ch) => Number(ch.charCodeAt(0)).toString(16))
    .join('');
export const hexToString = (hex: string) => {
  return chunk(hex.split(''), 2)
    .map((ch) => String.fromCharCode(Number(`0x${ch.join('')}`)))
    .join('');
};
