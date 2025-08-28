import { uid } from 'uid';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws'

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

async function openJobSearchPage() {
  // reload the page

  // reload if site is same
  if (document.location.href.includes('search/warehouse-jobs')) {
    console.log('Reloading the page...');
    window.location.reload();
    return;
  }
  window.location.href = `https://hiring.amazon.${site}/search/warehouse-jobs#/`;
}

let storage = {};

let country = 'Canada';
let locale = 'en-CA';
let site = 'ca';

function updateStorage() {
  country = storage.site === 'ca' ? 'Canada' : 'United States'
  locale = storage.site === 'ca' ? 'en-CA' : 'en-US'
  site = storage.site;
}


let autoRedirectTimer = null
async function autoRedirect() {
  console.log('check for auto redirect...')
  let url = document.URL;

  if (url.includes('job-opportunities')) {

    let params = new URLSearchParams(document.location.search);
    // TODO: withdraw application
    clearInterval(autoRedirectTimer)

    toast('Withdraw application');
    await withdrawApplication(params.get("applicationId"))
    openJobSearchPage()
  }
}

async function start() {
  let url = document.URL;

  storage = await loadStorage();
  updateStorage();
  console.log({ storage });

  if (url.includes('withdraw-applications')) {
    withdrawAllApplications()
    return
  }


  if (!storage.activated) {
    toast('Extension is not activated');
    return;
  }




  if (url.includes('bot=true')) {
    // autoRedirectTimer = setInterval(autoRedirect.bind(this), 1000)
  }

  let allowExecute = url.includes('search/warehouse-jobs');
  if (!allowExecute) {
    toast('Not allowed on this page - open search/warehouse-jobs');
    return;
  }


  toast('Extension is running');
  startPolling();
}

let activeRequests = 0;
let isBookingDone = false;

function startPolling() {
  let MAX_CONCURRENT = parseInt(storage.apiCallCount) || 1; // Set to 2 if you want more aggressive polling
  let delayGap = 1000 / MAX_CONCURRENT; // milliseconds
  const interval = setInterval(async () => {
    if (isBookingDone) {
      // 🎯 Found a match, stop future polling
      clearInterval(interval);
      toast('Processing stopped');
      return;
    }
    if (activeRequests >= MAX_CONCURRENT) return;

    activeRequests++;

    try {
      if (!storage.lessLog) toast('Fetching jobs...');
      let jobs = await getJobs();

      let allJobsCount = jobs.length;

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

      if (allJobsCount) {
        toast(`All jobs: ${allJobsCount} | Matched Jobs: ${jobs.length}`, {
          backgroundColor: ' #14746f',
        });
      }

      handleJobs(jobs);
    } catch (err) {
      console.error('Error in job poller:', err);
    } finally {
      activeRequests--;
    }
  }, delayGap); // Try every 200ms
}

start();

/*  store shifts data
    {
      id: job-id + shift-id,
      jobId: string,
      shiftId: string,
      date: num
    }
 */
let allShifts = new Map();

function autoRemoveShift(thresholdMs = 60 * 1000) {
  // default: 10 minutes
  const now = Date.now();
  for (let [id, shift] of allShifts.entries()) {
    if (now - (shift.createdAt || 0) > thresholdMs) {
      allShifts.delete(id);
      console.log(`Auto-removed shift ${id} (older than ${thresholdMs} ms)`);
    }
  }
}

setInterval(() => autoRemoveShift(), 2 * 1000);

function hasJobExist(jobId) {
  for (let shift of allShifts.values()) {
    if (shift.jobId === jobId) {
      return true;
    }
  }
  return false;
}

async function handleJobs(jobs) {
  // fetch all shift and add it to shifts
  jobs.forEach(async (job) => {
    // skip if old jobs are fetched
    let isExist = hasJobExist(job.jobId);
    if (isExist) return;
    const shifts = await getShift(job.jobId);

    toast(`Shift found: ${shifts.length}`, {
      backgroundColor: ' #1565c0',
    });
    console.log({ shifts });

    // add shift to array
    shifts.forEach((shift) => {
      let id = `${job.jobId} | ${shift.shiftId}`;

      allShifts.set(id, {
        id: id,
        jobId: job.jobId,
        shiftId: shift.shiftId,
        createdAt: Date.now(),
      });

      if (storage.bulkCA) {
        handleCreateUpdateApplication(id);
      } else {
        triggerCreateApplicationProcess();
      }
    });
  });
}

let isCreateApplicationProcessRunning = false;

function getNextKey(map, currentKey) {
  let found = false;
  for (let key of map.keys()) {
    if (found) return key;
    if (key === currentKey) found = true;
  }
  return undefined; // No next key found
}


function getPreviousKey(map, currentKey) {
  let prev = undefined;
  for (let key of map.keys()) {
    if (key === currentKey) {
      return prev; // the previous key (or undefined if currentKey is the first)
    }
    prev = key;
  }
  return undefined; // currentKey not found
}


// used for non-bulk options
async function triggerCreateApplicationProcess() {
  if (isCreateApplicationProcessRunning) {
    console.log('trigger already running');
    return;
  }

  isCreateApplicationProcessRunning = true;

  // get first key
  // let oldApplicationKey = allShifts.keys().next().value;
  let oldApplicationKey = [...allShifts.keys()].pop();
  let triggerCount = 0;
  while (oldApplicationKey) {
    triggerCount++;
    await handleCreateUpdateApplication(oldApplicationKey);
    oldApplicationKey = getPreviousKey(allShifts, oldApplicationKey);
  }

  toast('Trigger closed');
  console.log('trigger closed', triggerCount, allShifts.size);
  isCreateApplicationProcessRunning = false;
}

async function handleCreateUpdateApplication(id) {
  // toast('Update create application');
  // return;

  console.log({ cookie: document.cookie })

  try {
    if (isBookingDone) return;

    // get shift data
    let shift = allShifts.get(id);

    // await sleep(4 * 1000)
    // call create application api
    toast('Apply for application');
    let res = await createApplication(shift.jobId, shift.shiftId);


    if (!res) {
      toast('Failed to book application', { backgroundColor: ' #ff0000' });
      return;
    }
    // await sleep(4 * 1000)

    // call update application api
    toast('Update application (step 1)');
    let payload = {
      jobId: shift.jobId, scheduleId: shift.shiftId
    }
    let res2 = await updateApplication(
      res.applicationId,
      payload,
      'job-confirm'
    );


    if (!res2) {
      toast('Failed to update application (step 1)', { backgroundColor: ' #ff0000' });
      return;
    }


    await handleWsRequest(res.applicationId)




    // TODO: fix
    let res3 = await updateApplicationStep(res.applicationId, 'general-questions');
    if (!res3) {
      toast('Failed to update application step 1', { backgroundColor: ' #ff0000' });
      return;
    }


    // payload = {
    //   jobReferral: {
    //     hasReferral: "no"
    //   }
    // }
    // let res4 = await updateApplication(
    //   res.applicationId,
    //   payload,
    //   "general-questions"
    // );

    // if (!res4) {
    //   toast('Failed to update application (step 2)', { backgroundColor: ' #ff0000' });
    //   return;
    // }

    // // identification
    // let res5 = await updateApplicationStep(res.applicationId, 'self-identification');
    // if (!res5) {
    //   toast('Failed to update application step 2', { backgroundColor: ' #ff0000' });
    //   return;
    // }


    // payload = {
    //   selfIdentificationInfo: {
    //     ethnicity: "I choose not to Self-Identify",
    //     gender: "Male"

    //   }
    // }


    // let res6 = await updateApplication(
    //   res.applicationId,
    //   payload,
    //   "equal-opportunity-form"
    // );

    // if (!res6) {
    //   toast('Failed to update application (step 3)', { backgroundColor: ' #ff0000' });
    //   return;
    // }

    isBookingDone = true;
    await saveLogs()
    openApplicationPage(shift.jobId, shift.shiftId, res.applicationId);
  } catch (error) {
    console.log(error);
  }
}



async function handleWsRequest(applicationId) {

  let candidateId = localStorage.getItem("bbCandidateId")
  let authToken = localStorage.getItem("accessToken")
  let url = `wss://ufatez9oyf.execute-api.us-east-1.amazonaws.com/prod?applicationId=${applicationId}&candidateId=${candidateId}&authToken=${authToken}`
  const ws = await connectWebSocket(url)

  console.log("WS connected for app_id: " + applicationId);

  // ws.send("Hello server 👋");

  for await (const msg of receiveMessages(ws)) {
    console.log("Got:", msg);
    // if (msg.includes("Hello")) {
    //   console.log("Closing connection...");
    //   ws.close(); // gracefully close
    // }
  }

  console.log("WS closed for app_id: " + applicationId);
}

function openApplicationPage(jobId, shiftId, applicationId) {
  let url = `https://hiring.amazon.${site}/application/us/?CS=true&jobId=${jobId}&locale=${locale}&scheduleId=${shiftId}&ssoEnabled=1#/general-questions?CS=true&jobId=${jobId}&locale=${locale}&scheduleId=${shiftId}&ssoEnabled=1&applicationId=${applicationId}&bot=true`;
  window.location.href = url;
}

function toast(message, options = {}) {
  // console.log('Toast message:', message);
  createToast(message, options);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveLocations(locations) {
  let oldLocations = JSON.parse(localStorage.getItem('locations')) || [];

  // merge old locations with new locations
  locations = [...new Set([...oldLocations, ...locations])];
  chrome.storage.local.set({ locations: locations });
}




function getCommonHeader() {
  const myHeaders = new Headers();
  myHeaders.append('authorization', localStorage.getItem('accessToken'));
  myHeaders.append('accept', 'application/json, text/plain, */*');
  myHeaders.append('content-type', 'application/json;charset=UTF-8');
  myHeaders.append(
    'user-agent',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
  );
  myHeaders.append("cookie", document.cookie)
  myHeaders.append('country', country);


  return myHeaders
}


async function getJobs() {
  try {
    const myHeaders = getCommonHeader()
    myHeaders.set("authorization", getToken())

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
            { key: 'scheduleRequiredLanguage', val: locale },
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
          pageSize: 5,
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

    let data = await fetchData(
      'https://e5mquma77feepi2bdn4d6h3mpu.appsync-api.us-east-1.amazonaws.com/graphql',
      requestOptions,
      true
    );

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
  } catch (error) {
    console.error('Error in getJobs function:', error);
    return [];
  }
}

async function getShift(jobId) {
  try {
    const myHeaders = getCommonHeader()
    myHeaders.set("authorization", getToken())

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

    let data = await fetchData(
      'https://e5mquma77feepi2bdn4d6h3mpu.appsync-api.us-east-1.amazonaws.com/graphql',
      requestOptions
    );

    let shifts = data.data.searchScheduleCards.scheduleCards.map((shift) => {
      return {
        shiftId: shift.scheduleId,
        hours: shift.hoursPerWeek,
      };
    });
    return shifts;
  } catch (error) {
    console.error('Error in getShift function:', error);
    return [];
  }
}

async function createApplication(jobId, scheduleId) {
  // authorization token - accessToken

  try {

    const myHeaders = getCommonHeader()

    const raw = {
      jobId: jobId,
      dspEnabled: false,
      scheduleId: scheduleId,
      candidateId: localStorage.getItem('bbCandidateId'),
      activeApplicationCheckEnabled: false,
    };

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify(raw),
      redirect: 'follow',
    };

    let data = await fetchData(
      `https://hiring.amazon.${site}/application/api/candidate-application/ds/create-application/`,
      requestOptions
    );

    console.log(data);

    let res = data.data;
    return { applicationId: res.applicationId };
  } catch (error) {
    console.error('Error in createApplication function:', error);
    return null;
  }
}

async function updateApplication(applicationId, payload, type) {
  try {
    const myHeaders = getCommonHeader()

    const raw = JSON.stringify({
      applicationId: applicationId,
      payload: payload,
      type,
      dspEnabled: true,
    });

    const requestOptions = {
      method: 'PUT',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    };

    let data = await fetchData(
      `https://hiring.amazon.${site}/application/api/candidate-application/update-application`,
      requestOptions
    );

    console.log(data);

    let res = data.data;
    return res;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function updateApplicationStep(applicationId, stepName) {
  try {
    const myHeaders = getCommonHeader()

    const raw = {
      applicationId: applicationId,
      workflowStepName: stepName,
    };

    const requestOptions = {
      method: 'PUT',
      headers: myHeaders,
      body: JSON.stringify(raw),
      redirect: 'follow',
    };

    let res = await fetchData(
      `https://hiring.amazon.${site}/application/api/candidate-application/update-workflow-step-name`,
      requestOptions
    );

    console.log({ res })
    return res.data
  } catch (error) {
    console.log(error);
    return null
  }
}


async function withdrawAllApplications() {

  try {

    toast("Getting all applications")

    const myHeaders = getCommonHeader()
    myHeaders.set("accesstoken", localStorage.getItem('accessToken'));
    myHeaders.set("authorization", "Bearer token");

    const graphql = JSON.stringify({
      query: "query queryApplicationsByBBCandidateIdV2($locale: String!, $bbCandidateId: String!) {\n  queryApplicationsByBBCandidateIdV2(\n    locale: $locale\n    bbCandidateId: $bbCandidateId\n  ) {\n    didAllApplicationsLoaded\n    applications {\n      active\n      submitted\n      applicationId\n      applicationState\n    }\n    __typename\n  }\n}\n",
      variables: { "locale": locale, "bbCandidateId": localStorage.getItem("bbCandidateId") }
    })
    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: graphql,
      redirect: "follow"
    };


    let res = await fetchData(
      'https://zuzm2l7jovcizd7movvfj7qt3y.appsync-api.us-east-1.amazonaws.com/graphql',
      requestOptions
    );


    console.log({ res })


    for (const element of res.data.queryApplicationsByBBCandidateIdV2.applications) {
      if (element.active) {
        let r = await withdrawApplication(element.applicationId)
        r ? toast(`withdrawn ${element.applicationId}`, { backgroundColor: ' #1565c0' }) : toast(`failed to withdraw ${element.applicationId}`, { backgroundColor: ' #ff0000' })
        await sleep(3000)
      }
    }

  } catch (error) {
    console.error(error)
    toast("Something went wrong")

  }



}


async function withdrawApplication(applicationId) {
  try {
    const myHeaders = getCommonHeader()
    myHeaders.set('accesstoken', localStorage.getItem('accessToken'))
    myHeaders.set('authorization', "Bearer token")
    let values = ["Not interested in job location", "None of the above reasons", "Shift doesn't work for me", "Pay rate doesn't meet expectation"]

    const graphql = JSON.stringify({
      query: "mutation MyMutation($input: withdrawApplicationsInput!) {\n  withdrawApplications(input: $input) {\n    error\n    statusCode\n    __typename\n  }\n}\n",
      variables: {
        input: {
          bbCandidateId: localStorage.getItem("bbCandidateId"),
          withdrawReason: values[Math.round(Math.random() * (values.length - 1))],
          sfApplications: [],
          bbApplications: [applicationId]
        }
      }
    });
    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: graphql,
      redirect: 'follow',
    };

    let res = await fetchData(
      'https://zuzm2l7jovcizd7movvfj7qt3y.appsync-api.us-east-1.amazonaws.com/graphql',
      requestOptions
    );

    console.log(res)

    console.log({ res: res.data })
    return res.data
  } catch (error) {
    console.log(error);
    return null
  }
}

function today() {
  const today = new Date().toISOString().split('T')[0];
  return today;
}

let logsData = new Map();

async function fetchData(url, options = {}, isFetchJob = false) {
  let time = new Date().toUTCString();
  let id = uid();
  const response = await fetch(url, options);

  let data = {
    url: url,
    payload: options.body,
    method: options.method || 'GET',
    response: null,
    time: time,
  };

  if (!response.ok) {
    logsData.set(id, data);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  let responseData = await response.json();
  data.response = responseData;

  // if (isFetchJob) {
  //   if (!responseData.data.searchJobCardsByLocation.jobCards.length) {
  //     console.log('skipped log');
  //     return responseData;
  //   }
  // }
  logsData.set(id, data);
  return responseData;
}

setInterval(saveLogs, 1000 * 60 * 1); // every

async function saveLogs2() {
  console.log('Saving logs...');
  if (logsData.size < 2) return;

  let keys = Array.from(logsData.keys());

  let startTime = logsData.get(keys[0]).time;
  let endTime = logsData.get(keys[keys.length - 1]).time;

  const payload = {
    sessionTime: `${startTime} - ${endTime}`,
    data: [],
  };

  keys.forEach((key) => {
    let data = logsData.get(key);
    logsData.delete(key);
    payload.data.push(data);
  });

  let res = await fetch('http://localhost:3000/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    console.log('Logs saved successfully');
  } else {
    console.error('Failed to save logs');
  }
}

const supabase = createClient(
  'https://iwhfvdwcsfllmnvvwtvu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3aGZ2ZHdjc2ZsbG1udnZ3dHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NzQ4NDcsImV4cCI6MjA3MTM1MDg0N30.C81e0a9D-mWDOCXQrgswdFLOMQEa-D5-RVIJIwUMGLg'
);

// async function saveLogs() {
//   console.log('Saving logs...');
//   if (logsData.size < 2) return;

//   let keys = Array.from(logsData.keys());

//   let startTime = logsData.get(keys[0]).time;
//   let endTime = logsData.get(keys[keys.length - 1]).time;

//   const payload = {
//     sessionTime: `${startTime} - ${endTime}`,
//     data: [],
//   };

//   keys.forEach((key) => {
//     let data = logsData.get(key);
//     logsData.delete(key);
//     payload.data.push(data);
//   });

//   const { data, error } = await supabase.from('logs').insert([payload]);
//   if (error) throw error;

//   console.log('Log saved')
//   console.log({data})
//   return data;
// }

async function saveLogs() {

  if (!logsData) return null;
  let now = new Date().toUTCString()
  let keys = Array.from(logsData.keys());

  if (!keys.length) {
    console.log('Log skipped due to empty map')
    return
  }

  // build data array from snapshot (no deletes yet)
  const sessionItems = keys.map((k) => logsData.get(k));


  const payload = {
    session_time: ``, // display
    start_time: now,
    end_time: now,
    data: sessionItems, // jsonb array
  };
  // payload = {
  //   session_time: `${startTime} - ${endTime}`, // display
  //   start_time: startTime, // queryable
  //   end_time: endTime, // queryable
  //   data: sessionItems, // jsonb array
  // };

  try {
    const { data, error } = await supabase
      .from('logs')
      .insert([payload])
      .select()
      .single(); // returns the inserted row

    if (error) throw error;

    // only now do we clear the inserted items
    keys.forEach((k) => logsData.delete(k));

    console.log('Log saved:', data?.id ?? data);
    return data;
  } catch (err) {
    console.error('Failed to save logs:', err);
    // keep logsData intact so we can retry later
    return null;
  }
}



function connectWebSocket(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);

    ws.onopen = () => resolve(ws);
    ws.onerror = (err) => reject(err);
  });
}

async function* receiveMessages(ws) {
  const queue = [];
  let resolveNext;

  ws.onmessage = (event) => {
    if (resolveNext) {
      resolveNext({ value: event.data, done: false });
      resolveNext = null;
    } else {
      queue.push(event.data);
    }
  };

  while (true) {
    if (queue.length > 0) {
      yield queue.shift();
    } else {
      yield await new Promise(res => (resolveNext = res));
    }
  }
}


