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
        return (
          (await this.findOneByNameAndSourceProtocol(name, source, protocol)) ||
          (await this.save({ name, value, source, protocol }))
        );
      }),
    );
  }
}
