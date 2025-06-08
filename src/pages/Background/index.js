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
