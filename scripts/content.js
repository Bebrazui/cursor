console.log("Content script loaded.");

function vectorize(text) {
  return text.toLowerCase().split(/\s+/).filter(word => word.length > 0);
}

function getPageElements() {
  const clickableElements = document.querySelectorAll('a, button, [role="button"]');
  const inputElements = document.querySelectorAll('input[type="text"], input[type="password"], input[type="email"], textarea');
  
  let elements = [];
  let elementIndex = 0;

  clickableElements.forEach(element => {
    const text = (element.innerText || element.ariaLabel || '').trim();
    if (text) {
      const elementId = `agent-element-${elementIndex++}`;
      element.setAttribute('data-agent-id', elementId);
      elements.push({ id: elementId, text: text, vector: vectorize(text), tag: element.tagName, type: 'clickable' });
    }
  });

  inputElements.forEach(element => {
    const label = element.labels && element.labels.length > 0 ? element.labels[0].innerText : '';
    const text = (label || element.placeholder || element.ariaLabel || '').trim();
    if (text) {
      const elementId = `agent-element-${elementIndex++}`;
      element.setAttribute('data-agent-id', elementId);
      elements.push({ id: elementId, text: text, vector: vectorize(text), tag: element.tagName, type: 'input' });
    }
  });

  return elements;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_elements") {
    sendResponse({ elements: getPageElements() });
  } else if (request.action === "click_element") {
    const elementToClick = document.querySelector(`[data-agent-id='${request.elementId}']`);
    if (elementToClick) {
      elementToClick.click();
      sendResponse({ status: "Element clicked" });
    } else {
      sendResponse({ status: "Element not found" });
    }
  } else if (request.action === "type_in_element") {
    const elementToTypeIn = document.querySelector(`[data-agent-id='${request.elementId}']`);
    if (elementToTypeIn) {
      elementToTypeIn.value = request.value;
      sendResponse({ status: "Text typed in element" });
    } else {
      sendResponse({ status: "Element not found" });
    }
  }
});
