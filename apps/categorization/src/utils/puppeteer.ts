import puppeteer from 'puppeteer';

import { OnModuleInit } from '@nestjs/common';

export class Puppeteer implements OnModuleInit {
  public browser: puppeteer.Browser;

  async onModuleInit() {
    const defaultOptions = {
      headless: true,
      args: ['--disable-setuid-sandbox', '--no-sandbox', '--disable-gpu'],
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 1200,
        height: 800,
        isLandscape: true,
      },
    };
    this.browser = await puppeteer.launch(defaultOptions);
  }

  async openTab(): Promise<puppeteer.Page> {
    return this.browser.newPage();
  }

  async loadPage(url, waitTimeout = 1000): Promise<puppeteer.Page> {
    const page = await this.openTab();
    try {
      await page.goto(url);
      await page.waitForTimeout(waitTimeout);
    } catch (e) {
      await page.close();
      throw e;
    }
    return page;
  }
}
