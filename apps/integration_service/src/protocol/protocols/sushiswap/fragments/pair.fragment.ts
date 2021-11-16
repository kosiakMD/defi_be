import { erc20Fields } from './token.fragment';

const pairReserveFields = `
fragment pairReserveFields on Pair {
    reserveUSD
    reserveETH
    reserve0
    reserve1
}
`;

export const pairFields = `
${erc20Fields}
${pairReserveFields}
fragment pairFields on Pair {
    id
    totalSupply
    trackedReserveETH
    totalSupply
    volumeUSD
    untrackedVolumeUSD

    ...pairReserveFields

    volumeToken0
    token0Price
    token0 {
        ...erc20Fields
        derivedETH
        untrackedVolumeUSD
    }

    volumeToken1
    token1Price
    token1 {
        ...erc20Fields
        derivedETH
        untrackedVolumeUSD
    }
}`;
