import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { TokenBalance } from '../../interfaces/balance.interfaces';
import { BalancesLoadingStrategy, BalancesRequest } from '../index';

import axios from 'axios';
import fs from 'fs';
import * as solana from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import CoinGecko from 'coingecko-api';

const CoinGeckoClient = new CoinGecko();
let memcacheData = {};

@Injectable()
export class SolanaBalancesStrategy implements BalancesLoadingStrategy {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {
  }

  async getBalances({
                      address,
                      chainId,
                      tokens: originalTokens,
                      block,
                    }: BalancesRequest): Promise<TokenBalance[]> {
    const res = await solFetchWalletBalances(address);
    console.log('------------------------------------------------');
    console.log(res);
    console.log('------------------------------------------------');
    return res;
  }
}

// list of stable assets like usdc
const stablesAddresses = ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'];

function isStable(tokenInfo) {
  // tokenlist identify a stable coin for us
  if (tokenInfo.tags && tokenInfo.tags.indexOf('stablecoin') !== -1)
    return true;

  // if not, we try to find via our address list
  if (stablesAddresses.indexOf(tokenInfo.address) !== -1)
    return true;

  // if not, we try to find by it's name:
  if (tokenInfo.symbol && tokenInfo.symbol.toLowerCase().indexOf('usd') !== -1)
    return true;
  if (tokenInfo.name && tokenInfo.name.toLowerCase().indexOf('usd') !== -1)
    return true;

  return false;
}

async function urlLoad(url) {
  return await axios.get(url);
}

function fileLoad(file) {
  if (!fileExists(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

function fileWrite(file, str) {
  try {
    return fs.writeFileSync(file, str, 'utf8');
  } catch (e) {
    return false;
  }
  return false;
}

function fileExists(file) {
  try {
    return fs.existsSync(file);
  } catch (e) {
    return false;
  }
  return false;
}

async function memcache(file, url) {
  if (memcacheData[file + url]) {
    return memcacheData[file + url];
  }
  if (fileExists(file)) {
    memcacheData[file + url] = JSON.parse(fileLoad(file));
  } else {
    const json = (await urlLoad(url));
    const str = JSON.stringify(json.data.tokens);
    fileWrite(file, str);
    memcacheData[file + url] = json.data.tokens;
  }
  return memcacheData[file + url];
}

async function loadTokenList() {
  const tokenList = 'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json';
  return await memcache('/tmp/tokenlist.json', tokenList);
}

async function loadCoinGeckoPrices() {
  const file = '/tmp/coingecko-market-data.json';
  let res;
  if (memcacheData[file]) {
    res = memcacheData[file];
  } else if (fileExists(file)) {
    memcacheData[file] = JSON.parse(fileLoad(file));
    res = memcacheData[file];
  } else {
    const json = await CoinGeckoClient.coins.markets({ localization: 0, per_page: 10000 });
    fileWrite(file, JSON.stringify(json.data));
    memcacheData[file] = json.data;
    res = memcacheData[file];
  }
  let prices = {}; // indexed by id
  for (let i in res) {
    const id = res[i].id;
    prices[id] = {
      id: id,
      price: res[i].current_price,
      priceChange24h: res[i].price_change_percentage_24h,
    };
  }
  return prices;
}

async function getUsdPriceFromSolBalance(prices, amount, tokenInfo) {
  // find token price by id
  const id = tokenInfo.extensions && tokenInfo.extensions.coingeckoId ? tokenInfo.extensions.coingeckoId : '';
  const res = prices[id];
  if (!id || !res) {
    // not listed oin coingecko
    return {
      amountInUsd: 0,
      price: 0,
      priceChange24h: 0,
    };
  }

  if (isStable(tokenInfo)) {
    res.amountInUsd = amount.toFixed(2);
  } else {
    res.amountInUsd = (amount * res.price).toFixed(2);
  }
  return res;
}

async function solFetchWalletBalances(wallet) {
  const connection = new solana.Connection(solana.clusterApiUrl('mainnet-beta'), 'confirmed');
  // the public key object from wallet address
  const pubKey = new solana.PublicKey(wallet);

  let prices = await loadCoinGeckoPrices();
  let tokenListData = await loadTokenList();

  const res = await connection.getParsedTokenAccountsByOwner(pubKey,
    {
    programId: splToken.TOKEN_PROGRAM_ID,
    });
  // just loop, and map token list by address
  let tokenListByAddress = {};
  for (let i in tokenListData) {
    const tokenData = tokenListData[i];
    const tokenAddress = tokenData.address;
    tokenListByAddress[tokenAddress] = tokenData;
    // if( i == 0 ) console.log(tokenListByAddress[tokenAddress]);
  }

  // now loop on user list and append extra info:
  let tokenData = [];
  let nftData = [];

  for (let i in res.value) {
    const obj = res.value[i];
    const address = obj.account.data.parsed.info.mint;
    const amount = parseFloat(obj.account?.data?.parsed?.info?.tokenAmount?.uiAmountString);
    const decimals = obj.account?.data?.parsed?.info?.tokenAmount?.decimals;
    if (decimals === 0 && amount >= 1) {
      // this is a nft, according to solana
      nftData.push({ address: address, amount: amount });
    } else {
      // only with balance
      if (amount !== 0) {
        const tokenInfo = tokenListByAddress[address] || {};
        tokenInfo.address = address;
        tokenInfo.amountInSol = amount;
        // if we have token amount and sol price we compute the
        // amount in usdc of user assets
        tokenInfo.amountInUsd = await getUsdPriceFromSolBalance(prices, amount, tokenInfo);
        tokenData.push(tokenInfo);
      }
    }
  }


  // now get sol balance
  let solBalance = await connection.getBalance(pubKey);
  solBalance /= 1_000_000_000;
  if (solBalance > 0) {
    let solInfo = {
      amountInUsd: 0,
      amountInSol: solBalance,
      chainId: 102,
      address: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'SOL',
      decimals: 9,
      logoURI:
        'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      tags: [],
      extensions: {
        website: 'https://www.solana.com/',
        coingeckoId: 'solana',
      },
    };
    solInfo.amountInUsd = await getUsdPriceFromSolBalance(prices, solBalance, solInfo);
    // Use same token info from wSOL to SOL.
    // Note: So11111111111111111111111111111111111111112 is the Wrapped SOL
    tokenData.push(solInfo);
  }

  return tokenData;
}
