// TODO: Rename this file to base, not index.ts
export abstract class DelegationsStrategy {
  protected abstract url: string;

  public abstract getDelegatedAssets(address: string): Promise<any[]>;
}
