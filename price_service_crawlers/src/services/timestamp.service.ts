import { injectable } from 'inversify';

export interface Timestamp {
  unix: number;
  dateTime?: string;
}

@injectable()
export class TimestampService {

  public getCurrent(): Timestamp {
    return {
      unix: Date.now(),
    }
  }
}
