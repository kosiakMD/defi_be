import { PublicKey, GetProgramAccountsConfig } from '@solana/web3.js';

export function accountConfig(address: PublicKey, LAYOUT: any) {
  const config: GetProgramAccountsConfig = {
    commitment: 'confirmed',
    encoding: 'base64',
    filters: [
      {
        memcmp: {
          offset: LAYOUT.offsetOf('owner'),
          bytes: address.toString(),
        },
      },
      { dataSize: LAYOUT.span },
    ],
  };

  return config;
}

export function mergePoolConfig(LAYOUT: any) {
  const config: GetProgramAccountsConfig = {
    commitment: 'confirmed',
    encoding: 'base64',
    filters: [
      {
        dataSize: LAYOUT.span,
      },
    ],
  };

  return config;
}
