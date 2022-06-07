import puppeteer from 'puppeteer';

export async function getScreenshot(page: puppeteer.Page, url: string, dir: string) {
  try {
    await page.screenshot({ path: dir, fullPage: true });
  } catch (e) {
    this.logger.error(`Error create screenshot for ${url}`);
  }
  return `${dir}`;
}
