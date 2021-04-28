import axios from 'axios';

export const getCurrentCoinsPrices = async () =>{
  const {
    data: { prices },
  } = await axios.get(
    `https://integration.dfyield.xyz/v1/integration/pancake/prices`,
  );
  return prices;
}