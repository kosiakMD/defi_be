import { IconConfig } from '../icons.service';

export abstract class IconsStrategy {
  protected constructor(name: string, config?: any) {
    this.name = name;
    this.sourceConfig = config;
  }
  sourceConfig: any;
  name: string;

  public abstract loadIcons(iconConfig: IconConfig, httpService);
}
