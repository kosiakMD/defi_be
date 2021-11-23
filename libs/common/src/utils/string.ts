export function camelize(...texts: string[]): string {
  let result = '';
  texts.forEach((text, index) => {
    text = text.replace(/[-USER_\s.]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
    if (index === 0) {
      text = text.substr(0, 1).toLowerCase() + text.substr(1);
    }
    result += text;
  });
  return result;
}

export const isAllUppercase = (s: string): boolean => /[A-Z_]/y.test(s);

export function toCamelCase(string: string): string {
  return string.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match: string, index: number): string {
    if (+match === 0) return '';
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

export function capitalizeFirstLetter(string: string): string {
  return string[0].toUpperCase() + string.slice(1);
}

export const wrapInQuotes = (v: string): string => '"' + v + '"';

export function splitToArray(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.toLowerCase().split(',');
}

export const getKey = (...seed: Array<string | number>): string => seed.join('_');

export function concatStrings(...args): string {
  return args.join('_');
}
