import axios from 'axios';

export class AstroportGraph {
  public static async getPoolsInfo() {
    const { data } = await axios.post(`https://api.astroport.fi/graphql`, {
      query: `{ pools {
    lp_address
    pool_address
    astro_rewards {
      apr
      apy
    }
    pool_liquidity
    prices {
      token1_price_ust
      token1_address
      token2_address
      token2_price_ust
    }
    protocol_rewards {
      apr
      apy
    }
    total_rewards {
      apr
      apy
    }
  }
  }`,
    });
    return data.data;
  }
}
