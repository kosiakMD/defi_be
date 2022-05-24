import { ChainIdEnum } from '../enum';
import {keepAddressesByChainId} from '../utils/addresses';

const validEvmAddress = '0xdf54b6c6195ea4d948d03bfd818d365cf175cfc2';
const validTerraAddress = 'terra100yeqvww74h4yaejj6h733thgcafdaukjtw397'
const validSolanaAddress = 'Fm9rHUTF5v3hwMLbStjZXqNBBoZyGriQaFM6sTFz3K8A'
const validCardanoAddress = 'addr1q928gwvx5edmku48ry292r0e7zlmky4q5tspkm0xdtrh7lcxauguwlr9f5rjnz5a7hdchspnsafgdsypqam4dncpveeq30llfw'
const validCosmosAddress = 'cosmos176u7zzuhe3524ujx242cx3tfanl7gdfe8weldl'
const validKavaAddress = 'kava13nmmyxa5gtdahnpzd8dapyktmew5e8r077zw0k'
const validOsmosisAddress = 'osmo1jhtgfp42f2sz4d047sehpjfnqyj2v6cq5csafx';
const validSecretAddress = 'secret1fnfu2wulpqhx8cqeh52rnuhvuazjwl4wc22u27';
const validRoninAddress = 'ronin:3f29065b40353c7d823b5834e8ccff5cf1e539b2';

describe("keep addresses by chain id should", () => {
    it('Keep valid evm address', () => {
        const result = keepAddressesByChainId(validEvmAddress, ChainIdEnum.eth);

        expect(result[0]).toBe(validEvmAddress);
    })
    it('Remove non - valid evm address', () => {
        const result = keepAddressesByChainId(validEvmAddress + ',' + validCardanoAddress, ChainIdEnum.eth);

        expect(result[0]).toBe(validEvmAddress);
        expect(result.length).toBe(1);
    })

    it('Keep valid solana address', () => {
        const result = keepAddressesByChainId(validSolanaAddress, ChainIdEnum.sol);

        expect(result[0]).toBe(validSolanaAddress);
    })
    it('Remove non - valid solana address', () => {
        const result = keepAddressesByChainId(validEvmAddress + ',' + validSolanaAddress, ChainIdEnum.sol);

        expect(result[0]).toBe(validSolanaAddress);
        expect(result.length).toBe(1);
    })

    it('Keep valid terra address', () => {
        const result = keepAddressesByChainId(validTerraAddress, ChainIdEnum.terra);

        expect(result[0]).toBe(validTerraAddress);
    })
    it('Remove non - valid terra address', () => {
        const result = keepAddressesByChainId(validEvmAddress + ',' + validTerraAddress, ChainIdEnum.terra);

        expect(result[0]).toBe(validTerraAddress);
        expect(result.length).toBe(1);
    })

    it('Keep valid cosmos address', () => {
        const result = keepAddressesByChainId(validCosmosAddress, ChainIdEnum.cosmos);

        expect(result[0]).toBe(validCosmosAddress);
    })
    it('Remove non - valid cosmos address', () => {
        const result = keepAddressesByChainId(validEvmAddress + ',' + validCosmosAddress, ChainIdEnum.cosmos);

        expect(result[0]).toBe(validCosmosAddress);
        expect(result.length).toBe(1);
    })

    it('Keep valid kava address', () => {
        const result = keepAddressesByChainId(validKavaAddress, ChainIdEnum.kava);

        expect(result[0]).toBe(validKavaAddress);
    })
    it('Remove non - valid kava address', () => {
        const result = keepAddressesByChainId(validEvmAddress + ',' + validKavaAddress, ChainIdEnum.kava);

        expect(result[0]).toBe(validKavaAddress);
        expect(result.length).toBe(1);
    })

    it('Keep valid osmosis address', () => {
        const result = keepAddressesByChainId(validOsmosisAddress, ChainIdEnum.osmosis);

        expect(result[0]).toBe(validOsmosisAddress);
    })
    it('Remove non - valid osmosis address', () => {
        const result = keepAddressesByChainId(validEvmAddress + ',' + validOsmosisAddress, ChainIdEnum.osmosis);

        expect(result[0]).toBe(validOsmosisAddress);
        expect(result.length).toBe(1);
    })

    it('Keep valid secret address', () => {
        const result = keepAddressesByChainId(validSecretAddress, ChainIdEnum.secret);

        expect(result[0]).toBe(validSecretAddress);
    })
    it('Remove non - valid secret address', () => {
        const result = keepAddressesByChainId(validEvmAddress + ',' + validSecretAddress, ChainIdEnum.secret);

        expect(result[0]).toBe(validSecretAddress);
        expect(result.length).toBe(1);
    })

    it('Keep valid ronin address', () => {
        const result = keepAddressesByChainId(validRoninAddress, ChainIdEnum.ronin);

        expect(result[0]).toBe(validRoninAddress);
    })
    it('Remove non - valid ronin address', () => {
        const result = keepAddressesByChainId(validEvmAddress + ',' + validRoninAddress, ChainIdEnum.ronin);

        expect(result[0]).toBe(validRoninAddress);
        expect(result.length).toBe(1);
    })

    it('Keep valid cardano address', () => {
        const result = keepAddressesByChainId(validCardanoAddress, ChainIdEnum.cardano);

        expect(result[0]).toBe(validCardanoAddress);
    })
    it('Remove non - valid cardano address', () => {
        const result = keepAddressesByChainId(validEvmAddress + ',' + validCardanoAddress, ChainIdEnum.cardano);

        expect(result[0]).toBe(validCardanoAddress);
        expect(result.length).toBe(1);
    })
})