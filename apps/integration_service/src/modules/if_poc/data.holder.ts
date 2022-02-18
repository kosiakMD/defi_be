import { Injectable } from '@nestjs/common';

/**
 * Simple data holder. It is used to keep any information in memory. If PoC works it has to be replaces either with DB
 * implementation or any other storage
 */
@Injectable()
export class DataHolder {
  data: Map<string, any>;
  constructor() {
    this.data = new Map<string, any>();
  }

  async set(key, obj) {
    this.data.set(key, obj);
  }

  async get(key): Promise<any> {
    return this.data.get(key);
  }
}
