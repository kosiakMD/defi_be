import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AddressesRepository } from './addresses.repository';
import { BlacklistedAddress } from './dto/blacklisted.address';
import { BlacklistedAddressSaveDto } from './dto/blacklisted.address.save.dto';

@Injectable()
export class BlacklistService {
  private readonly addressesCacheKey = 'addresses_blacklisted';
  private readonly cacheTTLInSeconds: number;

  constructor(
    private readonly addressesRepository: AddressesRepository,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.cacheTTLInSeconds = config.get<number>('BLACKLISTED_CACHE_TTL_IN_SECONDS') || 300;
  }

  async getAll(): Promise<BlacklistedAddress[]> {
    return this.addressesRepository.getAll();
  }

  async getAllCached(): Promise<Map<string, boolean>> {
    const blacklistedAddresses: { 0: string; 1: boolean }[] = await this.cache.get(
      this.addressesCacheKey,
    );
    if (blacklistedAddresses === null) {
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

  async save(addressSaveDto: BlacklistedAddressSaveDto): Promise<BlacklistedAddress> {
    return await this.addressesRepository.save({
      id: null,
      address: addressSaveDto.address,
      comment: addressSaveDto.comment,
      createdAt: null,
    });
  }
}
