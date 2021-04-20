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
