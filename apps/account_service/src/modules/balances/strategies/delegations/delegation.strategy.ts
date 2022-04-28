export abstract class DelegationsStrategy {
  protected abstract url: string;

  protected abstract path: string;

  public abstract getDelegatedAssets(address: string): Promise<any[]>;
}
