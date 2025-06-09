import puppeteer from 'puppeteer';
console.log('Hello via Bun!');
// Or import puppeteer from 'puppeteer-core';

// Launch the browser and open a new blank page
const width = 1280;
const height = 720;

const browser = await puppeteer.launch({
  devtools: false,
  headless: false,
  args: [
    '--disable-extensions-except=/home/niteshkr/Documents/Codes/others/AmazonJobSchedule/build',
    '--load-extension=/home/niteshkr/Documents/Codes/others/AmazonJobSchedule/build',
    `--window-size=${width},${height}`,
  ],
});

// get browser width and height

let context = browser.defaultBrowserContext();

context.overridePermissions('https://hiring.amazon.com', ['geolocation']);
context.overridePermissions('https://hiring.amazon.ca', ['geolocation']);

const [page] = await browser.pages();
// await page?.setViewport({ width, height });
// page?.goto('https://hiring.amazon.com/search/warehouse-jobs');
page?.goto('https://www.google.com/');

// await browser.close();
