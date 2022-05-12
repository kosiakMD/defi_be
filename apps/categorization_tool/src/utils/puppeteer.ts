import puppeteer from 'puppeteer';

export class Puppeteer {
  public browser: Promise<puppeteer.Browser>;
  constructor() {
    this.launch();
  }

  private launch() {
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

    this.browser = puppeteer.launch(defaultOptions);
  }

  async openTab(): Promise<puppeteer.Page> {
    return (await this.browser).newPage();
  }

  async loadPage(url, waitTimeout = 1000) {
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
