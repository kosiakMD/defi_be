import Web3 from 'web3';

export class Web3Provider {
  private static web3: Web3;

  public static initWeb3(rpcUrl: string): Web3 {
    if (!Web3Provider.web3) {
      Web3Provider.web3 = new Web3(rpcUrl);
    }
    return Web3Provider.web3;
  }

  public static getWeb3(): Web3 {
    return Web3Provider.web3
      ? Web3Provider.web3
      : (function () {
          throw Error('Web3 provider is not initialized');
        })();
  }
}
