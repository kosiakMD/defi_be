import puppeteer from 'puppeteer';

export class Puppeteer {
  public browser: Promise<puppeteer.Browser>;
  private page: Promise<puppeteer.Page>;
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
    this.page = (await this.browser).newPage();
    return this.page;
  }

  async loadPage(url) {
    const page = await this.openTab();
    await page.goto(url, {
      waitUntil: 'load',
      // Remove the timeout
      timeout: 0,
    });
    return page;
  }
}
