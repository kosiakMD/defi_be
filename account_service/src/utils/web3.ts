import * as dotenv from 'dotenv';
import Web3 from 'web3';

dotenv.config();

export const web3 = new Web3(process.env.ETH_URL);
