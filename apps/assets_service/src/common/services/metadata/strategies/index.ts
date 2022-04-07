export abstract class MetadataStrategy {
  public abstract getMetadata(address, chainId, instance?): Promise<any>;
}
