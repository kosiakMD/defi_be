import { Protocol } from '../../database/entities/protocol.entity';
import { LinkTypeEnum } from '../../database/enum/link.type.enum';

export type mappedData = Map<
  string,
  {
    url: string;
    name: string;
    data: {
      appLink?: string[];
      docs?: string[];
      github?: string[];
      screen?: string;
      screenApp?: string[];
    };
  }
>;

export type TypeDocs = 'gitbook' | 'other';

export type FilteredLinks = Map<LinkTypeEnum, string[]>;

export interface IParsingAbstract {
  name?: string;
  url?: string;
}

export interface IListProtocol {
  url: string;
  name?: string;
  chain?: string;
}

export interface IListContract {
  address: string;
  protocol: Protocol;
}
