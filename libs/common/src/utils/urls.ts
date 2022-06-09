/**
 * Joins URL parts deduplicating any '/' and filling in any missing '/'
 *
 * @param parts url strings i.e. ['https://account-service', 'v1/assets']
 * @returns string
 */
export const join = (...parts: string[]): string =>
  parts
    .join('/')
    .split('/')
    .filter(Boolean)
    .join('/')
    .replace(/(http(s?)):\//, '$1://');
