console.log('This is the background page.');
console.log('Put the background scripts here.');
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'focusTab') {
    chrome.tabs.query({}, (tabs) => {
      const targetTab = tabs.find((tab) => tab.url.includes('jobDetail?jobId'));
      if (targetTab) {
        chrome.tabs.update(targetTab.id, { active: true });
        chrome.windows.update(targetTab.windowId, { focused: true });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'closeTab' && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    console.log('Request Headers:', details.requestHeaders);
    return {};
  },
  {
    urls: [
      'https://e5mquma77feepi2bdn4d6h3mpu.appsync-api.us-east-1.amazonaws.com/graphql',
    ],
  },
  ['requestHeaders']
);
