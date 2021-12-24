import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';

export class TrackedVaultItemsMap {
  private static readonly data: Map<string, TrackedVaultItem> = new Map<string, TrackedVaultItem>();

  static add(data: TrackedVaultItem | TrackedVaultItem[]): Map<string, TrackedVaultItem> {
    const arr = Array.isArray(data) ? data : [data];

    arr.forEach((item) => {
      // set unique id and db id to the map
      this.data.set(item.idUnique, item);
      this.data.set(item.id.toString(), item);
    });

    return this.data;
  }

  static get(): Map<string, TrackedVaultItem>;
  static get(id: string): TrackedVaultItem;
  static get(id?: string) {
    return id ? this.data.get(id) : this.data;
  }
}
