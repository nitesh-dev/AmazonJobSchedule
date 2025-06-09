import puppeteer from 'puppeteer';
console.log('Hello via Bun!');
// Or import puppeteer from 'puppeteer-core';

// Launch the browser and open a new blank page

const browser = await puppeteer.launch({
  devtools: true,
  headless: false,
  args: [
    '--disable-extensions-except=/home/niteshkr/Documents/Codes/others/AmazonJobSchedule/build',
    '--load-extension=/home/niteshkr/Documents/Codes/others/AmazonJobSchedule/build',
  ],
});

let context = browser.defaultBrowserContext();

context.overridePermissions('https://hiring.amazon.com', ['geolocation']);
context.overridePermissions('https://hiring.amazon.ca', ['geolocation']);

const [page] = await browser.pages();
await page?.setViewport({ width: 1280, height: 720 });
page?.goto('https://hiring.amazon.com/search/warehouse-jobs');

// await browser.close();
