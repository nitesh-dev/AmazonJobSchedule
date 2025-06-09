console.log('Content script works!');
console.log('Must reload extension for modifications to take effect.');

// Deny all permission requests by overriding the Permissions API
(function () {
  if (window.navigator && window.navigator.permissions) {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = function (parameters) {
      return Promise.resolve({ state: 'denied' });
    };
  }

  // Optionally, override geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = function (success, error) {
      if (typeof error === 'function') {
        error({ code: 1, message: 'User denied Geolocation' });
      }
    };
    navigator.geolocation.watchPosition = function (success, error) {
      if (typeof error === 'function') {
        error({ code: 1, message: 'User denied Geolocation' });
      }
    };
  }
})();

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

async function reloadPage(site) {
  await sleep(10000);
  // reload the page
  console.log('No jobs found, reloading the page...');

  // reload if site is same
  if (document.location.href.includes('search/warehouse-jobs')) {
    console.log('Reloading the page...');
    window.location.reload();
    return;
  }
  window.location.href = `https://hiring.amazon.${site}/search/warehouse-jobs#/`;
}

async function start() {
  let url = document.URL;

  let storage = await loadStorage();
  console.log({ storage });

  if (!storage.activated) {
    console.log('Extension is not activated');
    return;
  }

  try {
    // check the jobs
    if (url.includes('search/warehouse-jobs')) {
      // scrap data
      await waitForSelector(['.jobCardItem', '#jobNotFoundContainer']);
      let jobs = document.querySelectorAll('.jobCardItem');
      console.log(`Job founds: ${jobs.length}`);

      if (!jobs.length) {
        reloadPage(storage.site);
        return;
      }
      // items[0].click()
      let data = [];
      jobs.forEach((card) => {
        try {
          let children = card.querySelector('.jobCardIconContainer')
            .nextElementSibling.children;

          let title = children[0].querySelector('.jobDetailText').textContent;
          let shift =
            children[0].querySelector('.jobDetailText').nextElementSibling
              ?.textContent;

          let skipCount = 0;
          if (!shift) {
            skipCount = 1;
            shift = children[1].textContent;
          }
          let type = children[1 + skipCount].textContent;
          let duration = children[2 + skipCount].textContent;
          let rate = children[3 + skipCount].textContent;
          let location = children[4 + skipCount].textContent;
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
          // console.log(raw);
        } catch (error) {
          console.error('Error parsing job card:', error);
        }
      });

      // navigate to the job by filtering
      let filteredJobs = data.filter((item) => {
        // check for type
        if (storage.jobType !== 'any' && !item.type.includes(storage.jobType)) {
          console.log(`Skipping ${item.name} due to job type filter`);
          return false;
        }

        // check for duration
        if (
          storage.duration !== 'any' &&
          !item.duration.includes(storage.duration)
        ) {
          console.log(`Skipping ${item.name} due to duration filter`);
          return false;
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
          return false;
        }

        return true;
      });

      console.log(`Filtered jobs count: ${filteredJobs.length}`);

      // randomly select a job from the filtered jobs
      if (filteredJobs.length > 0) {
        let randomIndex = Math.floor(Math.random() * filteredJobs.length);
        let selectedJob = filteredJobs[randomIndex];
        console.log('Selected job:', selectedJob.name);

        // navigate to the job
        selectedJob.element.click();
      } else {
        console.log('No jobs matched the filters');
        reloadPage(storage.site);
        return;
      }
    }

    // apply for job
    if (url.includes('jobDetail?jobId')) {
      console.log('Applying for job...');

      await waitForSelector(['.jobDetailScheduleDropdown']);
      clickElement('.jobDetailScheduleDropdown');

      // delay to allow dropdown to open
      await waitForSelector(['.scheduleFlyoutLocationRow']);

      let cards = document.querySelector('.scheduleFlyoutLocationRow')
        .nextElementSibling.children;

      console.log(cards);
      // note first card is not a job

      // select any first
      if (cards.length > 1) {
        cards[1].click();
        // apply
        console.log('Applying...');
        clickElement('.jobDetailApplyButton');
        await sleep(2000);
        chrome.runtime.sendMessage({ action: 'closeTab' });
      }

      console.log('Job application process completed.');
    }

    // apply for application
    if (url.includes('/application/')) {
      console.log('Applying for application...');

      // wait for selctor to be available
      await waitForSelector(['.e4s17lp0.css-1ipr55l']);
      clickElement('.e4s17lp0.css-1ipr55l');
    }
  } catch (error) {
    console.error('Error in start function:', error);
    reloadPage(storage.site);
  }
}

start();

// multiple selector proceed when either one is available
function waitForSelector(selectors, timeout = 10000) {
  if (typeof selectors === 'string') selectors = [selectors];
  return new Promise((resolve, reject) => {
    const interval = 100;
    let elapsed = 0;
    const timer = setInterval(() => {
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(timer);
          resolve(el);
          return;
        }
      }
      if ((elapsed += interval) >= timeout) {
        clearInterval(timer);
        reject(
          new Error(`Timeout waiting for selectors: ${selectors.join(', ')}`)
        );
      }
    }, interval);
  });
}

// function waitForSelector(selector, timeout = 10000) {
//   return new Promise((resolve, reject) => {
//     const interval = 100;
//     let elapsed = 0;
//     const timer = setInterval(() => {
//       const el = document.querySelector(selector);
//       if (el) {
//         clearInterval(timer);
//         resolve(el);
//       } else if ((elapsed += interval) >= timeout) {
//         clearInterval(timer);
//         reject(new Error(`Timeout waiting for selector: ${selector}`));
//       }
//     }, interval);
//   });
// }

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
