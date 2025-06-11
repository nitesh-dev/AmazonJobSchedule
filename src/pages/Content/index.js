/* eslint-disable no-restricted-globals */
console.log('Content script works!');
console.log('Must reload extension for modifications to take effect.');

// Inject Toastify CSS
const toastifyCSS = document.createElement('link');
toastifyCSS.rel = 'stylesheet';
toastifyCSS.type = 'text/css';
toastifyCSS.href =
  'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css';
document.head.appendChild(toastifyCSS);

function getToken() {
  return (
    'Bearer Status|unauthenticated|Session|' +
    localStorage.getItem('sessionToken')
  );
}
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
  await sleep(5000);
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
    // apply for application
    if (url.includes('application/?page')) {
      console.log('Applying for application...');

      // wait for selctor to be available
      await waitForSelector(['.e4s17lp0.css-1ipr55l']);
      clickElement('.e4s17lp0.css-1ipr55l');
      return;
    } else if (
      (url.includes('application/us/?CS') && url.includes('/consent')) ||
      (url.includes('application/us/?CS') && url.includes('/pre-consent')) ||
      (url.includes('application/us/?CS') &&
        url.includes('/no-available-shift'))
    ) {
      // e4s17lp0 css-1ipr55l no-available-shift
      // candidateId - local storage: bbCandidateId
      let interval = setInterval(async () => {
        if (document.URL.includes('general-questions')) {
          clearInterval(interval);
          return;
        }
        await waitForSelector(['.e4s17lp0.css-1ipr55l'], 200);
        clickElement('.e4s17lp0.css-1ipr55l');
        console.log('Clicked on the create button');
      }, 500);

      return;
    }
    startProcess(storage);
  } catch (error) {
    console.error('Error in start function:', error);
  }
}

async function startProcess(storage) {
  let country = storage.site === 'com' ? 'United States' : 'Canada';
  let locale = storage.site === 'com' ? 'en-US' : 'en-CA';
  let site = storage.site;

  let jobs = [];
  while (jobs.length === 0) {
    toast('Fetching jobs...');
    jobs = await getJobs(getToken(), country, locale, site);

    let filteredJobs = jobs.filter((item) => {
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

    jobs = filteredJobs;

    console.log(`Filtered jobs count: ${filteredJobs.length}`);

    if (!jobs.length) continue;

    // get  random job
    let randomJob = jobs[Math.floor(Math.random() * jobs.length)];

    let shifts = await getShift(
      randomJob.jobId,
      getToken(),
      country,
      locale,
      site
    );

    console.log('Shifts:', shifts);

    if (!shifts.length) {
      jobs = [];
      continue;
    }

    // get random shift
    let randomShift = shifts[Math.floor(Math.random() * shifts.length)];
    openApplicationPage(randomJob.jobId, randomShift.shiftId);
    break;
  }
}

start();

function openApplicationPage(jobId, shiftId) {
  let url = `https://hiring.amazon.com/application/?page=pre-consent&jobId=${jobId}&scheduleId=${shiftId}&CS=true&locale=en-US&token=&ssoEnabled=1`;
  window.location.href = url;
}

function toast(message) {
  console.log('Toast message:', message);
  return;
  try {
    // eslint-disable-next-line no-undef
    Toastify({
      text: message,
      className: 'info',
      style: {
        background: 'linear-gradient(to right, #00b09b, #96c93d)',
      },
    }).showToast();
  } catch (error) {
    console.error('Error in toast function:', error);
  }
}

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

async function getJobs(
  token,
  country = 'United States',
  locale = 'en-US',
  site = 'com'
) {
  try {
    const myHeaders = new Headers();

    myHeaders.append('authorization', token);
    myHeaders.append('content-type', 'application/json');
    myHeaders.append('country', country);
    myHeaders.append(
      'user-agent',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    );

    const graphql = JSON.stringify({
      query:
        'query searchJobCardsByLocation($searchJobRequest: SearchJobRequest!) {\n  searchJobCardsByLocation(searchJobRequest: $searchJobRequest) {\n    jobCards {\n jobId\n employmentType\n jobTypeL10N\n scheduleCount\n locationName\n jobTitle  \n}\n  }\n}\n',
      variables: {
        searchJobRequest: {
          locale: locale,
          country: country,
          keyWords: '',
          equalFilters: [
            { key: 'shiftType', val: 'All' },
            { key: 'scheduleRequiredLanguage', val: 'en-US' },
          ],
          containFilters: [
            { key: 'isPrivateSchedule', val: ['false'] },
            {
              key: 'jobTitle',
              val: [
                'Amazon Fulfillment Center Warehouse Associate',
                'Amazon Sortation Center Warehouse Associate',
                'Amazon Delivery Station Warehouse Associate',
                'Amazon Distribution Center Associate',
                'Amazon Grocery Warehouse Associate',
                'Amazon Air Associate',
                'Amazon Warehouse Team Member',
                'Amazon XL Warehouse Associate',
              ],
            },
          ],
          rangeFilters: [
            { key: 'hoursPerWeek', range: { minimum: 0, maximum: 80 } },
          ],
          orFilters: [],
          dateFilters: [
            { key: 'firstDayOnSite', range: { startDate: '2025-06-08' } },
          ],
          sorters: [{ fieldName: 'totalPayRateMax', ascending: 'false' }],
          pageSize: 100,
          consolidateSchedule: true,
        },
      },
    });
    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: graphql,
      redirect: 'follow',
    };

    let response = await fetch(
      'https://e5mquma77feepi2bdn4d6h3mpu.appsync-api.us-east-1.amazonaws.com/graphql',
      requestOptions
    );

    if (response.ok) {
      const data = await response.json();
      // console.log(data);

      let jobs = data.data.searchJobCardsByLocation.jobCards.map((job) => {
        return {
          jobId: job.jobId,
          duration: job.employmentType.toLocaleLowerCase(),
          type: job.jobTypeL10N.toLocaleLowerCase(),
          shift: job.scheduleCount,
          location: job.locationName.toLocaleLowerCase(),
          name: job.jobTitle,
        };
      });

      // save locations to local storage
      let locations = jobs.map((job) => job.location.split(',')[0]);
      saveLocations(locations);
      return jobs;
    } else {
      throw new Error('Failed to fetch data');
    }
  } catch (error) {
    console.error('Error in getJobs function:', error);
    return [];
  }
}

function saveLocations(locations) {
  let oldLocations = JSON.parse(localStorage.getItem('locations')) || [];

  // merge old locations with new locations
  locations = [...new Set([...oldLocations, ...locations])];
  chrome.storage.local.set({ locations: locations });
}

async function getShift(
  jobId,
  token,
  country = 'United States',
  locale = 'en-US',
  site = 'com'
) {
  try {
    const myHeaders = new Headers();

    myHeaders.append('authorization', token);
    myHeaders.append('content-type', 'application/json');
    myHeaders.append('country', country);
    myHeaders.append(
      'user-agent',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    );

    const graphql = JSON.stringify({
      query:
        'query searchScheduleCards($searchScheduleRequest: SearchScheduleRequest!) {\n  searchScheduleCards(searchScheduleRequest: $searchScheduleRequest) {\n    scheduleCards {\n      scheduleId\n  hoursPerWeek\n   }\n  }\n}\n',
      variables: {
        searchScheduleRequest: {
          locale: locale,
          country: country,
          keyWords: '',
          equalFilters: [{ key: 'shiftType', val: 'All' }],
          containFilters: [
            { key: 'isPrivateSchedule', val: ['false'] },
            {
              key: 'jobTitle',
              val: [
                'Amazon Fulfillment Center Warehouse Associate',
                'Amazon Sortation Center Warehouse Associate',
                'Amazon Delivery Station Warehouse Associate',
                'Amazon Distribution Center Associate',
                'Amazon Grocery Warehouse Associate',
                'Amazon Air Associate',
                'Amazon Warehouse Team Member',
                'Amazon XL Warehouse Associate',
              ],
            },
          ],
          rangeFilters: [
            { key: 'hoursPerWeek', range: { minimum: 0, maximum: 80 } },
          ],
          orFilters: [],
          dateFilters: [
            { key: 'firstDayOnSite', range: { startDate: today() } },
          ],
          sorters: [{ fieldName: 'totalPayRateMax', ascending: 'false' }],
          pageSize: 1000,
          jobId: jobId,
          consolidateSchedule: true,
        },
      },
    });
    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: graphql,
      redirect: 'follow',
    };

    let response = await fetch(
      'https://e5mquma77feepi2bdn4d6h3mpu.appsync-api.us-east-1.amazonaws.com/graphql',
      requestOptions
    );

    if (response.ok) {
      const data = await response.json();
      console.log(data);

      let shifts = data.data.searchScheduleCards.scheduleCards.map((shift) => {
        return {
          shiftId: shift.scheduleId,
          hours: shift.hoursPerWeek,
        };
      });
      return shifts;
    } else {
      throw new Error('Failed to fetch data');
    }
  } catch (error) {
    console.error('Error in getShift function:', error);
    return [];
  }
}

async function createApplication(site, jobId, scheduleId) {
  // authorization token - accessToken

  try {
    const myHeaders = new Headers();
    myHeaders.append('authorization', localStorage.getItem('accessToken'));
    myHeaders.append('content-type', 'application/json;charset=UTF-8');
    myHeaders.append(
      'user-agent',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    );

    const raw = {
      jobId: jobId,
      dspEnabled: true,
      scheduleId: scheduleId,
      candidateId: localStorage.getItem('bbCandidateId'),
      activeApplicationCheckEnabled: true,
    };

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify(raw),
      redirect: 'follow',
    };

    fetch(
      `https://hiring.amazon.${site}/application/api/candidate-application/ds/create-application/`,
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => console.log(result))
      .catch((error) => console.error(error));
  } catch (error) {
    console.error('Error in createApplication function:', error);
  }
}

function today() {
  const today = new Date().toISOString().split('T')[0];
  return today;
}
