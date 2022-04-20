export abstract class DelegationsStrategy {
  url: string;
  public abstract getDelegatedAssets(address: string): any;
}
