import { ChainIdEnum } from '../enum';
import { join } from '../utils/urls';

const ValidHttpUrl = 'http://asset-service/v1/assets';
const ValidHttpsUrl = 'https://asset-service/v1/assets';
const ValidUrlWithPort = 'http://asset-service:3006/v1/assets';

const httpUrlComponents = [
  ['http://asset-service', 'v1/assets'],
  ['http://asset-service', '/v1/assets'],
  ['http://asset-service/', 'v1/assets'],
  ['http://asset-service/', '/v1/assets'],
  ['http://asset-service/', '/v1/', '/assets'],
];
const httpsUrlComponents = [
  ['https://asset-service', 'v1/assets'],
  ['https://asset-service', 'v1', 'assets'],
  ['https://asset-service', '/v1/assets'],
  ['https://asset-service/', 'v1/assets'],
  ['https://asset-service/', '/v1/assets'],
  ['https://asset-service/', '/v1/', '/assets'],
];
const urlWithPortComponents = [
  ['http://asset-service:3006', 'v1/assets'],
  ['http://asset-service:3006', '/v1/assets'],
  ['http://asset-service:3006/', 'v1/assets'],
  ['http://asset-service:3006/', '/v1/assets'],
];

describe('keep addresses by chain id should', () => {
  test.each(httpUrlComponents.map((parts) => [parts, ValidHttpUrl]))(
    'Keeps HTTP when joining url parts',
    (parts, expected) => {
      const result = join(...parts);
      expect(result).toBe(expected);
    },
  );
  test.each(httpsUrlComponents.map((parts) => [parts, ValidHttpsUrl]))(
    'Keeps HTTPS when joining url parts',
    (parts, expected) => {
      const result = join(...parts);
      expect(result).toBe(expected);
    },
  );

  test.each(urlWithPortComponents.map((parts) => [parts, ValidUrlWithPort]))(
    'Keeps Port number when joining url parts',
    (parts, expected) => {
      const result = join(...parts);
      expect(result).toBe(expected);
    },
  );
});
