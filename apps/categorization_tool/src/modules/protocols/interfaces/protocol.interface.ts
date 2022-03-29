import { Link } from '../../database/entities/link.entity';
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
  link?: Link;
  name?: string;
  url?: string;
}

export interface IListProtocol {
  protocol: string;
  chain?: string;
}

export interface IParsingReturned {
  contract: string;
  protocol: number;
  extras: Link;
}
