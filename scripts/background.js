chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open_new_tab") {
    if (request.url) {
      chrome.tabs.create({ url: request.url });
    } else {
      chrome.tabs.create({});
    }
    sendResponse({ status: "success", message: "Открыл новую вкладку." });
  } 
  return true;
});
