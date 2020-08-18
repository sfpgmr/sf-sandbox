import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ignoreHTTPSErrors: true} );
  const page = await browser.newPage();
  await page.goto('https://localhost:5500/new-page/current/build/');
  await fs.promises.writeFile('../current/build/test.html',await page.content(),'utf-8');
  await browser.close();
})();