// TODO: Rename this file to base, not index.ts
export abstract class DelegationsStrategy {
  url: string;
  public abstract getDelegatedAssets(address: string): any;
}
