console.log("Popup script loaded.");

// --- Функция расстояния Левенштейна ---
function levenshtein(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
}

// --- Функции чат-интерфейса ---
function addMessage(text, sender) {
    const chatbox = document.getElementById('chatbox');
    const message = document.createElement('div');
    message.classList.add('message', `${sender}-message`);
    message.textContent = text;
    chatbox.appendChild(message);
    chatbox.scrollTop = chatbox.scrollHeight; // Прокрутка вниз
}


document.addEventListener('DOMContentLoaded', () => {
  const commandInput = document.getElementById('commandInput');
  const executeBtn = document.getElementById('executeBtn');
  let pageElements = [];

  // --- Загрузка элементов из content script ---
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "get_elements" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Ошибка при получении элементов:", chrome.runtime.lastError.message);
          addMessage("Ошибка: Не удалось связаться со страницей. Перезагрузите вкладку и попробуйте снова.", "bot");
          return;
        }
        if (response && response.elements) {
          pageElements = response.elements;
          console.log("Полученные элементы:", pageElements);
          addMessage("Привет! Я готов помочь. Что вы хотите сделать?", "bot");
        } else {
             addMessage("Не удалось найти интерактивные элементы на этой странице.", "bot");
        }
      });
    }
  });

  function executeCommand() {
    const commandText = commandInput.value.trim();
    if (!commandText) return;

    addMessage(commandText, "user");
    commandInput.value = ''; // Очистить поле ввода

    // 1. Определяем действие и целевой текст
    let action = 'click';
    let valueToType = '';
    let targetText = commandText;

    const typeMatch = commandText.match(/type ['"](.+?)['"] in (.+)/i);
    const clickMatch = commandText.match(/(?:click|press|tap) (.+)/i);

    if (typeMatch && typeMatch.length === 3) {
      action = 'type';
      valueToType = typeMatch[1];
      targetText = typeMatch[2];
    } else if (clickMatch && clickMatch.length === 2) {
      action = 'click';
      targetText = clickMatch[1];
    }

    // 2. Ищем лучшее совпадение с помощью расстояния Левенштейна
    let bestMatch = { distance: Infinity, element: null };

    pageElements.forEach(element => {
      if ((action === 'click' && element.type !== 'clickable') ||
          (action === 'type' && element.type !== 'input')) {
        return;
      }

      const distance = levenshtein(targetText, element.text);
      if (distance < bestMatch.distance) {
        bestMatch.distance = distance;
        bestMatch.element = element;
      }
    });

    // Нормализуем расстояние в "оценку сходства" (необязательно, но полезно для пороговых значений)
    if (bestMatch.element) {
        const similarity = 1 - (bestMatch.distance / Math.max(targetText.length, bestMatch.element.text.length));
        
        // Установим порог, например, 0.6
        if (similarity < 0.6) {
            console.log("Не найдено уверенного совпадения для:", commandText);
            addMessage(`Я не уверен, что вы имеете в виду под "${commandText}". Не могли бы вы быть точнее?`, "bot");
            return;
        }
    }


    // 3. Отправляем команду в content script
    if (bestMatch.element) {
        const botResponse = (action === 'click')
            ? `Хорошо, нажимаю на "${bestMatch.element.text}".`
            : `Хорошо, ввожу "${valueToType}" в "${bestMatch.element.text}".`;
        addMessage(botResponse, "bot");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
         if(tabs[0] && tabs[0].id){
            const request = (action === 'click')
                ? { action: 'click_element', elementId: bestMatch.element.id }
                : { action: 'type_in_element', elementId: bestMatch.element.id, value: valueToType };

            chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Ошибка при выполнении команды:", chrome.runtime.lastError.message);
                    addMessage("Что-то пошло не так на странице.", "bot");
                } else {
                    console.log(response.status);
                }
            });
         }
      });
    } else {
      console.log("Не найдено совпадений для команды:", commandText);
      addMessage(`Я не смог найти ничего похожего на "${targetText}" на странице.`, "bot");
    }
  }
  
  executeBtn.addEventListener('click', executeCommand);
  commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
          executeCommand();
      }
  });

});
