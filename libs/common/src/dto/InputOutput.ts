import { IInputOutput } from '@app/common';

export class InputOutput<T = any> implements IInputOutput {
  data?: T = null;
  plain?: string = null;
}
