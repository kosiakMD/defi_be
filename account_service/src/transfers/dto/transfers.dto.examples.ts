import { TransferDto } from './transfers.dto';

export const exampleChain1: TransferDto = {
  chainId: 1,
  hash: '0x6277ad9a3302420a63d01f8c26a3e4c810ba5c6a44138253abf03c5b7cccd29b',
  blockTimeStamp: '1554803381',
  // TODO: until no gas in DB
  // gasUsed: '21000',
  erc20Transfers: [
    {
      fromAddress: '0xbd3a43c39f4a3b06bed77c2345597ea8467368c4',
      toAddress: '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      amount: '255338000000000000',
      token: {
        address: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
        name: 'Basic Attention Token',
        symbol: 'BAT',
        decimals: 18,
      },
      tokenPriceUSD: 15.4971,
      totalPriceUSD: 2.8770831063e-12,
    },
  ],
};

export const exampleChain2WithErrorNoPrice: TransferDto = {
  chainId: 2,
  hash: '0x52415f1a094ed09799879b294762b9b8484e827e14754aea177ad322b59f680a',
  blockTimeStamp: '1621776463',
  // TODO: until no gas in DB
  // gasUsed: null,
  erc20Transfers: [
    {
      fromAddress: '0x0d0707963952f2fba59dd06f2b425ace40b492fe',
      toAddress: '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      amount: '113900000000000000',
      token: {
        address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
        name: 'Ethereum Token',
        symbol: 'ETH',
        decimals: 18,
      },
      tokenPriceUSD: null,
      totalPriceUSD: null,
    },
  ],
};

export const exampleResponse = {
  '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85': [exampleChain1, exampleChain2WithErrorNoPrice],
};
