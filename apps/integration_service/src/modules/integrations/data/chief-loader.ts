import { Injectable } from '@nestjs/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { plainToClass } from 'class-transformer';
import { CallData } from '@app/common/dto/CallData';

const chiefPoolsDefinitions = [
  [
    {
      "property":"poolLength",
      "path": "output.data",
      "type": "number",
      "abi": {
        "inputs": [],
        "name": "poolLength",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "poolInfo",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "allocPoint",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "lastRewardBlock",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "accTriPerShare",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
  ],
]

@Injectable()
export class ChiefLoader {
  constructor(private readonly multicall: MulticallAggregator) {
  }

  // isMasterchief(); // farming or staking
  // isSingleToken
  async grabAllPools(address, abi, chain) {
    console.log('address');
    console.log(address);
    console.log('abi');
    console.log(abi);

    // we found matched list of calls:
    const poolLength = chiefPoolsDefinitions[0].find((call) => call.property === 'poolLength');
    const poolLengthCall = plainToClass(CallData, {
      address: address,
      abi: poolLength.abi,
    })
    console.log(poolLengthCall);
    const poolLengthCallResult = await this.multicall.handleInBatches(new Map<string, CallData>([['poolLength', poolLengthCall]]), chain.id);
    console.log(poolLengthCallResult);
    // load vaults with their features
    // for (let i = 0; i < )

    // pool length

    // await this.multicall.handleInBatches()
    // get pool length and create vault for it in the database like:
  }
}
