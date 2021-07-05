import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';

@Injectable()
export class UtilsDatabase {
  constructor(private connection: Connection) {}

  async dbTransactionBegin(): Promise<void> {
    await this.connection.query('begin');
  }

  async dbTransactionCommit(): Promise<void> {
    await this.connection.query('commit');
  }

  async dbTransactionRollback(): Promise<void> {
    await this.connection.query('rollback');
  }
}
