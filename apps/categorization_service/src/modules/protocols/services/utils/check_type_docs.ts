import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Puppeteer } from '../../../../utils';
import { TypeDocs } from '../../interfaces/protocol.interface';

@Injectable()
export class CheckTypeDoc {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
  ) {}

  async run(url): Promise<TypeDocs> {
    // console.log('check docs - ', url);
    const page = await this.browser.openTab();
    await page.goto(url);
    await page.waitForTimeout(1000);

    const evaluated = await page.evaluate(() => {
      const list = [];
      const links = document.querySelectorAll('a');

      for (const key in links) {
        // links[key]?.innerHTML?.search('/powered By+.+GitBook/ig');
        // if (links[key].innerHTML.includes('Powered By GitBook')) {
        //   return true;
        // }
        list.push(links[key].innerHTML);
      }

      return list;
    });

    let type: TypeDocs = 'other';
    for (const e of evaluated) {
      if (e?.search(/powered By+.+GitBook/gi) >= 0) {
        type = 'gitbook';
      }
    }
    return type;
  }
}
