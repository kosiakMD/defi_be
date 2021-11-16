import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';

// it is hard to manage this map in many places, so i decided to keep it here
export class TrackedVaultItemsMap {
  private static readonly data: Map<string, TrackedVaultItem> = new Map<string, TrackedVaultItem>();

  static add(data: TrackedVaultItem | TrackedVaultItem[]): Map<string, TrackedVaultItem> {
    if (Array.isArray(data)) {
      data.forEach((i) => {
        // set unique id and db id to the map
        this.data.set(i.idUnique, i);
        this.data.set(i.id.toString(), i);
      });
    } else {
      this.data.set(data.id.toString(), data);
      this.data.set(data.idUnique, data);
    }
    return this.data;
  }

  static get(id?: string): TrackedVaultItem | Map<string, TrackedVaultItem> {
    if (id) {
      return this.data.get(id);
    }
    return this.data;
  }
}
