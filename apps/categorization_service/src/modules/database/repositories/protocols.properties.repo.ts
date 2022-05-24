import { EntityRepository, Repository } from 'typeorm';

import { Protocol } from '../entities/protocol.entity';
import { ProtocolProperty } from '../entities/protocol.property.entity';

@EntityRepository(ProtocolProperty)
export class ProtocolsPropertiesRepository extends Repository<ProtocolProperty> {
  async findOneByNameAndSourceProtocol(
    name: string,
    source: string,
    protocol: Protocol,
  ): Promise<ProtocolProperty> {
    return this.findOne({
      where: { name, source, protocol },
    });
  }

  async upsertProtocolProperties(
    props: { name: string; value: string }[],
    source: string,
    protocol: Protocol,
  ): Promise<ProtocolProperty[]> {
    return Promise.all(
      props.map(async ({ name, value }): Promise<ProtocolProperty> => {
        const existing = await this.findOneByNameAndSourceProtocol(name, source, protocol);
        if (!existing) {
          return this.save({ name, value, source, protocol });
        }

        if (existing?.value !== value?.toString()) {
          await this.update({ id: existing.id }, { value });
        }

        return existing;
      }),
    );
  }
}
