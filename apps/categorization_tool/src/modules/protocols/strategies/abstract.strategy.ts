import { IParsingAbstract } from '../interfaces/protocol.interface';

export abstract class AbstractStrategy {
  public abstract parsing({ link, name, url }: IParsingAbstract);
}
