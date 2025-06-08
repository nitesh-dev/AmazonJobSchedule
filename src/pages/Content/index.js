console.log('Content script works!');
console.log('Must reload extension for modifications to take effect.');

function loadStorage() {
  // create async function to load data from chrome storage
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['settings'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.settings || []);
      }
    });
  });
}

async function start() {
  let url = document.URL;
  console.log(url);

  let storage = await loadStorage();
  console.log(storage);

  if (!storage.activated) {
    console.log('Extension is not activated');
    return;
  }

  // check the jobs
  if (url.includes('search/warehouse-jobs')) {
    // scrap data
    await waitForSelector('.jobCardItem');
    let items = document.querySelectorAll('.jobCardItem');
    console.log(`Job founds: ${items.length}`);
    // items[0].click()
    let data = [];
    items.forEach((card) => {
      let children = card.querySelector('.jobCardIconContainer')
        .nextElementSibling.children;

      let title = children[0].querySelector('.jobDetailText').textContent;
      let shift =
        children[0].querySelector('.jobDetailText').nextElementSibling
          .textContent;
      let type = children[1].textContent;
      let duration = children[2].textContent;
      let rate = children[3].textContent;
      let location = children[4].textContent;
      let raw = {
        shift: shift,
        name: title,
        type: type.toLocaleLowerCase(),
        duration: duration.toLocaleLowerCase(),
        rate: rate,
        location: location.toLocaleLowerCase(),
        element: card,
      };

      data.push(raw);
      //   console.log(raw);
    });

    // navigate to the job by filtering
    for (let index = 0; index < data.length; index++) {
      const item = data[index];

      // check for type
      if (storage.jobType !== 'any' && !item.type.includes(storage.jobType)) {
        console.log(`Skipping ${item.name} due to job type filter`);
        continue;
      }

      // check for duration
      if (
        storage.duration !== 'any' &&
        !item.duration.includes(storage.duration)
      ) {
        console.log(`Skipping ${item.name} due to duration filter`);
        continue;
      }

      // check for location
      let isMatch = false;
      for (let i = 0; i < storage.locations.length; i++) {
        const loc = storage.locations[i];
        if (item.location.includes(loc)) {
          isMatch = true;
          break;
        }
      }

      if (storage.locations.length && isMatch === false) {
        console.log(`Skipping ${item.name} due to location filter`);
        continue;
      }

      console.log('match found');
      // navigate to the job
      item.element.click();
      break;
    }
  }

  // apply for job
  if (url.includes('jobDetail?jobId')) {
    console.log('Applying for job...');

    await waitForSelector('.jobDetailScheduleDropdown');
    clickElement('.jobDetailScheduleDropdown');

    // delay to allow dropdown to open
    await waitForSelector('.scheduleFlyoutLocationRow');

    let cards = document.querySelector('.scheduleFlyoutLocationRow')
      .nextElementSibling.children;

    console.log(cards);
    // note first card is not a job

    // select any first
    if (cards.length > 1) {
      cards[1].click();
      await delay(3000);

      // apply
      console.log('Applying...');
      setInterval(() => {
        // chrome.runtime.sendMessage({ action: 'focusTab' });
        // let applyBtn = document.querySelector('.jobDetailApplyButton');
        // applyBtn.click();
        clickElement('.jobDetailApplyButton');
        console.log('Apply button clicked');
      }, 2000);
    }

    console.log('Job application process completed.');
  }

  // apply for application
  if (url.includes('/application/')) {
    console.log('Applying for application...');

    // wait for selctor to be available
    await waitForSelector('.e4s17lp0.css-1ipr55l');
    clickElement('.e4s17lp0.css-1ipr55l');
  }
}

start();
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForSelector(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const interval = 100;
    let elapsed = 0;
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        resolve(el);
      } else if ((elapsed += interval) >= timeout) {
        clearInterval(timer);
        reject(new Error(`Timeout waiting for selector: ${selector}`));
      }
    }, interval);
  });
}

function clickElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    fakeUserInteraction(element);
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    console.log('✅ Clicked:', selector);
  } else {
    console.warn('❌ Element not found:', selector);
  }
}

function fakeUserInteraction(target) {
  const mouseMove = new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  const mouseDown = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  target.dispatchEvent(mouseMove);
  target.dispatchEvent(mouseDown);
}
