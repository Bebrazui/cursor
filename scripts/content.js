chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "execute_command") {
    const command = request.command.toLowerCase();
    const elements = Array.from(document.querySelectorAll('a, button, input, [role="button"], textarea'));

    let targetElement = null;

    if (command.startsWith('нажми на')) {
      const searchText = command.replace('нажми на', '').trim().replace(/['"]/g, '');
      targetElement = findBestMatch(searchText, elements, ['clickable']);
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
            const fieldName = parts[2] || ''; // handle case where fieldName is not provided
            let inputElement = findBestMatch(fieldName, elements, ['input']);
            
            if(inputElement) {
                inputElement.value = value;
                sendResponse({ status: 'success', message: `Ввел '${value}' в поле.` });
            } else {
                sendResponse({ status: 'error', message: 'Не нашел, куда вводить.' });
            }
        }
    } else {
      sendResponse({ status: 'error', message: 'Неизвестная команда.' });
    }
    return true; // Keep the message channel open for async response
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

        if(searchText === '' && types.includes('input')) { // If no specific input field is mentioned
          bestMatch = element;
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
