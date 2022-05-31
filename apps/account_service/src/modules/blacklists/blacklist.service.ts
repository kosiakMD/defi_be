import { Cache } from 'cache-manager';
import { EntityManager, Repository } from 'typeorm';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { CrudService } from '@app/common/services/crud.service';

import { BlacklistedAddressSaveDto } from './dto/blacklisted.address.save.dto';
import { BlacklistedAddressesEntity } from './entities/blacklisted-addresses.entity';

@Injectable()
export class BlacklistService extends CrudService<BlacklistedAddressesEntity> {
  private readonly addressesCacheKey = 'addresses_blacklisted';
  private readonly cacheTTLInSeconds: number;

  constructor(
    @InjectRepository(BlacklistedAddressesEntity)
    private readonly blackListedAddressesRepository: Repository<BlacklistedAddressesEntity>,
    private manager: EntityManager,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    super(blackListedAddressesRepository);
    this.cacheTTLInSeconds = config.get<number>('BLACKLISTED_CACHE_TTL_IN_SECONDS') || 300;
  }

  async getAllCached(): Promise<Map<string, boolean>> {
    const blacklistedAddresses: { 0: string; 1: boolean }[] = await this.cache.get(
      this.addressesCacheKey,
    );
    if (!blacklistedAddresses) {
      const blacklistedAddressesMap = new Map<string, boolean>();
      (await this.getAll()).forEach((ca) => {
        blacklistedAddressesMap.set(ca.address, true);
      });
      await this.cache.set(this.addressesCacheKey, Array.from(blacklistedAddressesMap), {
        ttl: this.cacheTTLInSeconds,
      });
      return blacklistedAddressesMap;
    }
    return new Map<string, boolean>(blacklistedAddresses.map((a) => [a[0], a[1]]));
  }

  async filterIsBlacklisted(addresses: string[]): Promise<string[]> {
    const blacklistedAddresses: Map<string, boolean> = await this.getAllCached();
    addresses = addresses.filter((a) => {
      return blacklistedAddresses.get(a.toLowerCase()) === true;
    });
    return addresses;
  }

  async upsertOne(addressSaveDto: BlacklistedAddressSaveDto): Promise<any> {
    const address = await this.get({ address: addressSaveDto.address });
    if (address) {
      return await this.patch({ id: address.id }, addressSaveDto);
    }
    return this.create(addressSaveDto);
  }
}
