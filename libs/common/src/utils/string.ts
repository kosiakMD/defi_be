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

export function capitalizeFirstLetter(string: string): string {
  return string[0].toUpperCase() + string.slice(1);
}

export function splitToArray(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.split(',');
}

export const getKey = (...seed: Array<string | number>): string => seed.join('_');

export function concatStrings(...args): string {
  return args.join('_');
}
