import * as dotenv from 'dotenv'

dotenv.config();

export default {
  ETH: process.env.SERVER_PORT ? process.env.SERVER_PORT : 3000,
  BSC: process.env.BSC_URL ? process.env.BSC_URL : '',
  THEGRAPH_UNISWAP: process.env.THEGRAPH_UNISWAP_ENDPOINT,
  SWAP: process.env.SWAP_0X_ENDPOINT,
  THEGRAPH_CURVE: process.env.THEGRAPH_CURVE_ENDPOINT,
  THEGRAPH_BALANCER: process.env.THEGRAPH_BALANCER_ENDPOINT,
  THEGRAPH_SUSHISWAP: process.env.THEGRAPH_SUSHISWAP_ENDPOINT,
}

