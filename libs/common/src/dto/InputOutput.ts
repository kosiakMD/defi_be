import { IInputOutput } from '@app/common';

export class InputOutput<T> implements IInputOutput {
  data?: T = null;
  plain?: string = null;
}
