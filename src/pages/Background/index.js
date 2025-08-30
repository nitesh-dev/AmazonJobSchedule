console.log('This is the background page.');
console.log('Put the background scripts here.');
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'focusTab') {
//     chrome.tabs.query({}, (tabs) => {
//       const targetTab = tabs.find((tab) => tab.url.includes('jobDetail?jobId'));
//       if (targetTab) {
//         chrome.tabs.update(targetTab.id, { active: true });
//         chrome.windows.update(targetTab.windowId, { focused: true });
//       }
//     });
//   }
// });

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'closeTab' && sender.tab) {
//     chrome.tabs.remove(sender.tab.id);
//   }
// });

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'inject') {
//     chrome.scripting.executeScript({
//       target: sender.id,
//       func: () => {
//         const script = document.createElement('script');
//         script.src = 'https://cdn.jsdelivr.net/npm/toastify-js';
//         script.type = 'text/javascript';
//         script.onload = () => console.log('Toastify loaded');
//         document.body.appendChild(script);
//       },
//     });
//   }
// });

// use it for getting token
// chrome.webRequest.onBeforeSendHeaders.addListener(
//   (details) => {
//     console.log('Request Headers:', details.requestHeaders);
//   },
//   {
//     urls: [
//       '<all_urls>',
//     ],
//   },
//   ['requestHeaders']
// );





// urls: [
//   'https://hiring.amazon.com/application/api/candidate-application/update-application/*',
//   'https://hiring.amazon.ca/application/api/candidate-application/update-application/*',

// ],



// Keep track of pending requests: customId -> tabId
const waitingTabs = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {


  console.log({ msg, sender })
  if (msg.type === "WAIT_FOR_RESULT") {
    // Store which tab is waiting for this customId
    waitingTabs.set(msg.id, sender.tab.id);
    console.log("Tab", sender.tab.id, "is waiting for", msg.id);
  } else if (msg.type === "OPEN_NEW_TAB") {
    chrome.tabs.create({ url: msg.url, active: true }, (tab) => {
      console.log("Opened new tab", tab.id, "for id", msg.id);
    });
  } else if (msg.type === "RESULT") {
    const targetTabId = waitingTabs.get(msg.id);

    if (targetTabId) {
      chrome.tabs.sendMessage(targetTabId, msg, () => {
        if (chrome.runtime.lastError) {
          console.warn(
            "Could not send to tab",
            targetTabId,
            chrome.runtime.lastError.message
          );
        }
      });

      // Clean up after delivering the result
      // waitingTabs.delete(msg.id);
    } else {
      console.warn("No tab was waiting for", msg.id);
    }
  }
});
