import {
  AssembledAssetInterface,
  AssetRequestInterface,
  AssetResponseInterface,
} from '../interfaces';

/**
 * TODO: Check deep nested  ie. curve tokens, and non-evm chains
 */
export const assemble = (
  requests: AssetRequestInterface,
  { assets }: AssetResponseInterface,
): AssembledAssetInterface[] => {
  // We lowercase the 'key' so that it matches the users request, regardless of the
  // case/checksum, however we don't touch the returned casing
  const map = new Map(assets.map((a) => [`${a.chainId}_${a.address}`.toLowerCase(), a]));

  return requests.assets.reduce((acc, { address, chainId }) => {
    const asset = map.get(`${chainId}_${address}`.toLowerCase());
    if (!asset) return acc;

    const underlying = [];
    if (Array.isArray(asset.underlying)) {
      asset.underlying.forEach((under) => {
        const underAsset = map.get(`${asset.chainId}_${under.address}`.toLowerCase());

        underlying.push({
          ...underAsset,
          position: under.position,
          reserve: under.reserve,
        });
      });
    }

    acc.push({
      ...asset,
      address, // return user-cased address (lowercase requests get returned as lowercase)
      underlying,
    });

    return acc;
  }, []);
};
