/* eslint-disable no-restricted-globals */
console.log('Content script works!');
console.log('Must reload extension for modifications to take effect.');

function createToast(message, options = {}) {
  const {
    duration = 1000,
    position = 'bottom-left',
    backgroundColor = '#333',
    textColor = '#fff',
  } = options;

  // Create or reuse container
  let container = document.querySelector('.__pure_toast_container');
  if (!container) {
    container = document.createElement('div');
    container.className = '__pure_toast_container';
    container.style.position = 'fixed';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column-reverse'; // new toasts on bottom, older move up
    container.style.gap = '10px';
    container.style.pointerEvents = 'none';

    // Positioning logic
    if (position.includes('top')) container.style.top = '16px';
    if (position.includes('bottom')) container.style.bottom = '16px';
    if (position.includes('left')) container.style.left = '16px';
    if (position.includes('right')) container.style.right = '16px';

    document.body.appendChild(container);
  }

  // Create the toast
  const toast = document.createElement('div');
  toast.className = '__pure_toast';
  toast.textContent = message;
  toast.style.padding = '12px 18px';
  toast.style.background = backgroundColor;
  toast.style.color = textColor;
  toast.style.borderRadius = '6px';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  toast.style.fontSize = '14px';
  toast.style.maxWidth = '300px';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  toast.style.transition = 'all 0.3s ease';
  toast.style.pointerEvents = 'auto';

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Animate out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.addEventListener('transitionend', () => {
      toast.remove();
      if (!container.hasChildNodes()) container.remove();
    });
  }, duration);
}

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
    toast('Extension is not activated');
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
    startPolling(storage);
  } catch (error) {
    console.error('Error in start function:', error);
  }
}

let activeRequests = 0;
let stopPolling = false;

function startPolling(storage) {
  let MAX_CONCURRENT = parseInt(storage.apiCallCount) || 1; // Set to 2 if you want more aggressive polling
  const interval = setInterval(async () => {
    if (activeRequests >= MAX_CONCURRENT || stopPolling) return;

    activeRequests++;

    try {
      const country = storage.site === 'com' ? 'United States' : 'Canada';
      const locale = storage.site === 'com' ? 'en-US' : 'en-CA';
      const site = storage.site;

      toast('Fetching jobs...');
      let jobs = await getJobs(getToken(), country, locale, site);

      // Filter jobs
      jobs = jobs.filter((item) => {
        if (storage.jobType !== 'any' && !item.type.includes(storage.jobType)) {
          console.log(`Skipping ${item.name} due to job type filter`);
          return false;
        }

        if (
          storage.duration !== 'any' &&
          !item.duration.includes(storage.duration)
        ) {
          console.log(`Skipping ${item.name} due to duration filter`);
          return false;
        }

        if (
          storage.locations.length > 0 &&
          !storage.locations.some((loc) => item.location.includes(loc))
        ) {
          console.log(`Skipping ${item.name} due to location filter`);
          return false;
        }

        return true;
      });

      console.log(`Filtered jobs count: ${jobs.length}`);

      if (!jobs.length) return;

      const randomJob = jobs[Math.floor(Math.random() * jobs.length)];

      const shifts = await getShift(
        randomJob.jobId,
        getToken(),
        country,
        locale,
        site
      );

      console.log('Shifts:', shifts);

      if (!shifts.length) return;

      const randomShift = shifts[Math.floor(Math.random() * shifts.length)];

      // 🎯 Found a match, stop future polling
      stopPolling = true;
      clearInterval(interval);

      openApplicationPage(randomJob.jobId, randomShift.shiftId);
    } catch (err) {
      console.error('Error in job poller:', err);
    } finally {
      activeRequests--;
    }
  }, 200); // Try every 200ms
}

start();

function openApplicationPage(jobId, shiftId) {
  let url = `https://hiring.amazon.com/application/?page=pre-consent&jobId=${jobId}&scheduleId=${shiftId}&CS=true&locale=en-US&token=&ssoEnabled=1`;
  window.location.href = url;
}

function toast(message) {
  console.log('Toast message:', message);
  createToast(message);
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
            { key: 'firstDayOnSite', range: { startDate: today() } },
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
