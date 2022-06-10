import { assemble } from '../helpers/assemble';
import { MockGetBulkAssetsResponse } from './mocks/mock-get-bulk-assets-response';

// todo solana and other types of addresses
const request = [
  {
    chainId: 1,
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  },
  {
    chainId: 4,
    address: '0xfdb9ab8b9513ad9e419cf19530fee49d412c3ee3',
  },
  {
    chainId: 4,
    address: '0x01424c64c4744769299019be64f3d82898ff28f3',
  },
  {
    chainId: 4,
    address: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
  },
  {
    chainId: 4,
    address: '0x321162Cd933E2Be498Cd2267a90534A804051b11',
  },
];

describe('assemble asset requests where possible', () => {
  it('returns the correct number of assets', () => {
    const results = assemble({ assets: request }, MockGetBulkAssetsResponse);
    expect(results.length).toBe(request.length);
    for (const value of results) {
      expect(value).toBeTruthy();
    }
    expect(results[1].underlying[0].name).toBe('Wrapped Fantom');
    expect(results[1].underlying[1].name).toBe('Bitcoin');
  });

  it('matches the request when all addresses are upper cased', () => {
    const results = assemble(
      { assets: request.map((r) => ({ ...r, address: r.address.toUpperCase() })) },
      MockGetBulkAssetsResponse,
    );
    expect(results.length).toBe(request.length);
  });

  it('matches the request when all addresses are lower cased', () => {
    const results = assemble(
      { assets: request.map((r) => ({ ...r, address: r.address.toLowerCase() })) },
      MockGetBulkAssetsResponse,
    );
    expect(results.length).toBe(request.length);
  });

  it('returns the response using checksummed addresses', () => {
    const btc = {
      chainId: 4,
      address: '0x321162Cd933E2Be498Cd2267a90534A804051b11', // checksummed
    };

    const results = assemble(
      {
        assets: [btc],
      },
      {
        assets: [MockGetBulkAssetsResponse.assets.find((t) => t.address === btc.address)],
      },
    );

    expect(results[0].address).toBe(btc.address);
    expect(results[0].address).not.toBe(btc.address.toLowerCase());
  });

  it('returns the response using lowercased addresses', () => {
    const btc = {
      chainId: 4,
      address: '0x321162Cd933E2Be498Cd2267a90534A804051b11'.toLowerCase(),
    };

    const results = assemble(
      {
        assets: [btc],
      },
      {
        assets: [
          MockGetBulkAssetsResponse.assets.find((t) => t.address.toLowerCase() === btc.address),
        ],
      },
    );

    expect(results[0].address).toBe(btc.address.toLowerCase());
  });

  it('skips invalid or unavailable tokens', () => {
    const invalid = {
      chainId: 1,
      address: '0xabcd1234',
    };

    const results = assemble(
      {
        assets: [invalid],
      },
      {
        assets: [],
      },
    );

    expect(results.length).toBe(0);
  });
});
