import { plainToClass } from 'class-transformer';
import { EntityManager, getManager } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { BlacklistedAddress } from './dto/blacklisted.address';

@Injectable()
export class AddressesRepository {
  async getAll(): Promise<BlacklistedAddress[]> {
    const manager: EntityManager = getManager();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return plainToClass(
      BlacklistedAddress,
      await manager.query('select * from addresses_blacklisted'),
    );
  }

  async save(blacklistedAddress: BlacklistedAddress): Promise<BlacklistedAddress> {
    const manager: EntityManager = getManager();
    const saveQuery: string =
      `insert into addresses_blacklisted (address, comment, created_at)
       values (
      '${blacklistedAddress.address}', ` +
      (blacklistedAddress.comment ? `'${blacklistedAddress.comment}'` : null) +
      `, default)
      on conflict (address) do update set comment = excluded.comment;`;
    await manager.query(saveQuery);
    return await this.findByAddress(blacklistedAddress.address);
  }

  async findByAddress(address: string): Promise<BlacklistedAddress> {
    const manager: EntityManager = getManager();
    const findQuery = `select * from addresses_blacklisted where address = '${address}' limit 1;`;
    const blacklistedDbAddresses: BlacklistedAddress[] = await manager.query(findQuery);
    if (blacklistedDbAddresses[0]) {
      return plainToClass(BlacklistedAddress, blacklistedDbAddresses[0]);
    }
    return null;
  }
}
