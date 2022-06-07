export * from './call.dto';
export * from './chain.dto';
export * from './currency.dto';
export * from './integrations.dto';
export * from './notify.payload.features.dto';
export * from './price.response.dto';
export * from './responses.dto';

export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }

  from(data: string): number {
    return Number(data);
  }
}
