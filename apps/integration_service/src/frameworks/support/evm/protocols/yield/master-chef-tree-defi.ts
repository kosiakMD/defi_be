import { MasterChef } from './master-chef';

export class MasterChefTreeDefi extends MasterChef {
  updateFunctionPredicates() {
    // override rewardPerSecond. Current masterchef predicate guesses
    // getCurrentPerBlock instead of treePerBlock and then fails to find the reward
    // token called 'getCurrent' instead of looking for 'tree'
    this.functionPredicates.rewardPerSecond = () => (item) => item.name === 'treePerBlock';
  }
}
