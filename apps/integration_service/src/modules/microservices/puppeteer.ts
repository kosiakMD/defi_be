import puppeteer from 'puppeteer';

export class Puppeteer {
  private async launch() {
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

    return puppeteer.launch(defaultOptions);
  }

  public async extractText(url, waitTimeout = 1000) {
    const browser = await this.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForTimeout(waitTimeout);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const text = await page.$eval('*', (el) => el.innerText);
    await browser.close();
    return text;
  }
}
