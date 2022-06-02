export abstract class AbstractCosmosProvider {
  tokenMap: { [key: string]: string };
  network: string;

  public getNetwork(address: string): string {
    const prefix = /(^[a-zA-Z]+[1]{1})/g.exec(address)?.[0] || '';

    return this.tokenMap[prefix] || '';
  }
}
