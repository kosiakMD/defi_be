export abstract class DelegationsStrategy {
  protected abstract url: string;

  public abstract getDelegatedAssets(address: string): any;
}
