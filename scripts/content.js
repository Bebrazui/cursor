chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "execute_command") {
    const command = request.command.toLowerCase();
    const elements = Array.from(document.querySelectorAll('a, button, input, [role="button"], textarea'));

    if (command.startsWith('нажми на')) {
      const searchText = command.replace('нажми на', '').trim().replace(/['"]/g, '');
      const targetElement = findBestMatch(searchText, elements, ['clickable']);
      if (targetElement) {
        targetElement.click();
        sendResponse({ status: 'success', message: `Нажал на ${targetElement.innerText}` });
      } else {
        sendResponse({ status: 'error', message: 'Не нашел, что нажать.' });
      }
    } else if (command.startsWith('введи')) {
        const parts = command.match(/введи\s+['"]([^'"]+)['"](?:\s+в\s+['"]([^'"]+)['"])?/);
        if(parts) {
            const value = parts[1];
            const fieldName = parts[2] || '';
            const inputElement = findBestMatch(fieldName, elements, ['input']);
            if(inputElement) {
                inputElement.value = value;
                sendResponse({ status: 'success', message: `Ввел '${value}' в поле.` });
            } else {
                sendResponse({ status: 'error', message: 'Не нашел, куда вводить.' });
            }
        }
    } else if (command.startsWith('прокрути')) {
        if (command.includes('вниз')) {
            window.scrollBy(0, window.innerHeight);
            sendResponse({ status: 'success', message: 'Прокрутил вниз.' });
        } else if (command.includes('вверх')) {
            window.scrollBy(0, -window.innerHeight);
            sendResponse({ status: 'success', message: 'Прокрутил вверх.' });
        } else if (command.includes('самый низ')) {
            window.scrollTo(0, document.body.scrollHeight);
            sendResponse({ status: 'success', message: 'Прокрутил в самый низ.' });
        } else if (command.includes('самый верх')) {
            window.scrollTo(0, 0);
            sendResponse({ status: 'success', message: 'Прокрутил в самый верх.' });
        }
    } else if (command === 'назад') {
        history.back();
        sendResponse({ status: 'success', message: 'Перешел назад.' });
    } else if (command === 'вперед') {
        history.forward();
        sendResponse({ status: 'success', message: 'Перешел вперед.' });
    } else if (command === 'обнови') {
        location.reload();
        sendResponse({ status: 'success', message: 'Страница обновлена.' });
    } else if (command.startsWith('открой')) {
        if (command.includes('новую вкладку')) {
            chrome.runtime.sendMessage({ action: 'open_new_tab' });
            sendResponse({ status: 'success', message: 'Открываю новую вкладку.' });
        } else {
            const url = command.replace('открой', '').trim();
            chrome.runtime.sendMessage({ action: 'open_new_tab', url: `http://${url}` });
            sendResponse({ status: 'success', message: `Открываю ${url}.` });
        }
    } else if (command.startsWith('найди')) {
        const searchText = command.replace('найди', '').trim();
        const found = window.find(searchText);
        if (found) {
            sendResponse({ status: 'success', message: `Нашел '${searchText}'.` });
        } else {
            sendResponse({ status: 'error', message: `Не нашел '${searchText}'.` });
        }
    } else if (command === 'краткая выжимка') {
        const text = document.body.innerText;
        sendResponse({ status: 'success', message: text.substring(0, 500) + '...' });
    } else {
      sendResponse({ status: 'error', message: 'Неизвестная команда.' });
    }
    return true;
  }
});

function vectorize(text) {
  return text.toLowerCase().split(/\s+/).filter(word => word.length > 0);
}

function cosineSimilarity(vec1, vec2) {
  const intersection = new Set(vec1.filter(word => vec2.includes(word)));
  const dotProduct = intersection.size;

  const magnitude1 = Math.sqrt(vec1.length);
  const magnitude2 = Math.sqrt(vec2.length);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

function findBestMatch(searchText, elements, types) {
    let bestMatch = null;
    let highestScore = -1;
    const searchVector = vectorize(searchText);

    elements.forEach(element => {
        const isClickable = element.matches('a, button, [role="button"]');
        const isInput = element.matches('input, textarea');

        let elementType = isClickable ? 'clickable' : (isInput ? 'input' : 'other');
        
        if (!types.includes(elementType)) return;

        let text = '';
        if (isClickable) {
            text = (element.innerText || element.ariaLabel || '').toLowerCase();
        } else if (isInput) {
            text = (element.placeholder || element.ariaLabel || (element.labels && element.labels[0] && element.labels[0].innerText) || '').toLowerCase();
        }

        if(searchText === '' && types.includes('input')) {
          if (!bestMatch) bestMatch = element;
          return;
        }
        
        if (text) {
            const elementVector = vectorize(text);
            const score = cosineSimilarity(searchVector, elementVector);

            if (score > highestScore) {
                highestScore = score;
                bestMatch = element;
            }
        }
    });

    return bestMatch;
}
