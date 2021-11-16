import { TrackedVault } from '../../store/tracked.vault.entity';
import { concatStrings } from '../../utils/string';

// it is hard to manage this map in many places, so i decided to keep it here
export class TrackedVaultsMap {
  private static readonly data: Map<string, TrackedVault> = new Map<string, TrackedVault>();

  static add(data: TrackedVault | TrackedVault[]): Map<string, TrackedVault> {
    if (Array.isArray(data)) {
      data.forEach((tv) => {
        this.data.set(concatStrings(tv.chainId, tv.protocol, tv.feature), tv);
      });
    } else {
      this.data.set(concatStrings(data.chainId, data.protocol, data.feature), data);
    }
    return this.data;
  }

  static get(id?: string): TrackedVault | Map<string, TrackedVault> {
    if (id) {
      return this.data.get(id);
    }
    return this.data;
  }

  static del(id: string): boolean {
    return this.data.delete(id);
  }
}
