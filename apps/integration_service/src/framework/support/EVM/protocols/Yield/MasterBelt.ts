import { MasterChef } from './MasterChef';

export class MasterBelt extends MasterChef {
  protected getUserInfoAmountKey(): string {
    return 'shares';
  }
}
