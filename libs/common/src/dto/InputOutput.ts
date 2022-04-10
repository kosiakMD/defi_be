import { IInputOutput } from '../interfaces';

export class InputOutput<T = any> implements IInputOutput {
  data?: T = null;
  plain?: string = null;
}
