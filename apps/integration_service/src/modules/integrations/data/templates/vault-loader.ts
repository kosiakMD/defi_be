import { Injectable } from '@nestjs/common';
import { ChiefLoader } from './chief/loader';


@Injectable()
export class VaultLoader {
  constructor(private chief: ChiefLoader) {
  }

  async load(address, chain, config) {
    const features = this.chief.collectFeatures(address, config, chain)
    // const ft = await this.chief.collectFeatures()
    console.log('loading template')
    // console.log(template)
  }
}
