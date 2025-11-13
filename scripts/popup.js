console.log("Popup script loaded.");

document.addEventListener('DOMContentLoaded', () => {
  const commandInput = document.getElementById('commandInput');
  const executeBtn = document.getElementById('executeBtn');
  let pageElements = [];

  // Загружаем элементы со страницы
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "get_elements" }, (response) => {
        if (!chrome.runtime.lastError && response && response.elements) {
          pageElements = response.elements;
          console.log("Received elements:", pageElements);
        }
      });
    }
  });

  executeBtn.addEventListener('click', () => {
    const commandText = commandInput.value.trim();
    if (!commandText) return;

    // 1. Определяем действие (клик или ввод)
    let action = 'click';
    let valueToType = '';
    const typeMatch = commandText.match(/type '(.+)' in/i);
    if (typeMatch && typeMatch[1]) {
      action = 'type';
      valueToType = typeMatch[1];
    }

    // 2. Улучшенный алгоритм сопоставления (коэффициент Жаккара)
    const commandVector = new Set(commandText.toLowerCase().split(/\s+/));

    let bestMatch = { score: 0, element: null };

    pageElements.forEach(element => {
      // Ищем только подходящие по типу элементы
      if ((action === 'click' && element.type !== 'clickable') || 
          (action === 'type' && element.type !== 'input')) {
        return;
      }

      const elementVector = new Set(element.vector);
      const intersection = new Set([...commandVector].filter(x => elementVector.has(x)));
      const union = new Set([...commandVector, ...elementVector]);
      const score = intersection.size / union.size;

      if (score > bestMatch.score) {
        bestMatch.score = score;
        bestMatch.element = element;
      }
    });

    // 3. Отправляем команду в content script
    if (bestMatch.element) {
      const activeTabId = chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
         if(tabs[0] && tabs[0].id){
            let request = {};
            if (action === 'click') {
                request = { action: 'click_element', elementId: bestMatch.element.id };
            } else {
                request = { action: 'type_in_element', elementId: bestMatch.element.id, value: valueToType };
            }
            chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
                console.log(response.status);
            });
         }
      });
    } else {
      console.log("No match found for command:", commandText);
    }
  });
});
