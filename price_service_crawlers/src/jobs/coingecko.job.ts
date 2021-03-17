import { ETH_ADDRESS, TEST_TOKENS } from '../utils/constants';
import { isETH } from '../utils/common';
import axios from 'axios';
export type TokenPrices = { [key: string]: number };

const baseUrl = 'https://api.coingecko.com/api/v3';
const tokens: string[] = TEST_TOKENS;
const http = axios;


 
  const getEthPrice = async (): Promise<number> => {
    
    const { data } = await http.get(`${baseUrl}/coins/markets?vs_currency=usd&ids=ethereum`);
    return data[0].current_price;
  }

  const getTokenPrices =  async (): Promise<TokenPrices> => {

    if (!tokens.length) {
      return {};
    }
    const response: TokenPrices = {};

    // NOTE: Special handling of ETH
    if (tokens.includes(ETH_ADDRESS)) {
      response[ETH_ADDRESS] = await getEthPrice();
    }

    const addresses = tokens.filter(token => !isETH(token)).join(',');
    const { data } = await http.get(`${baseUrl}/simple/token_price/ethereum?contract_addresses=${addresses}&vs_currencies=usd`);

    return Object.keys(data).reduce((response, key) => ({
      ...response,
      [key]: data[key].usd
    }), response);
  }

  export  const crawlCoingeckoJob = async (job: any, done: any): Promise<void>  => {
    console.log('Crawling');
    let results = await getTokenPrices();
    console.log("Done, Got results:")
    console.log(results)
    done();
  }