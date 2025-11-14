document.addEventListener('DOMContentLoaded', () => {
    const commandInput = document.getElementById('commandInput');
    const executeBtn = document.getElementById('executeBtn');
    const chatbox = document.getElementById('chatbox');

    // Focus on the input field when the popup opens
    commandInput.focus();

    const addMessage = (text, sender) => {
        const message = document.createElement('div');
        message.classList.add('message', `${sender}-message`);
        message.textContent = text;
        chatbox.appendChild(message);
        chatbox.scrollTop = chatbox.scrollHeight; // Scroll to the bottom
    };

    const executeCommand = () => {
        const command = commandInput.value.trim();
        if (!command) return;

        addMessage(command, 'user');
        commandInput.value = '';

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Check if the tab is valid for execution
            if (!tabs[0] || tabs[0].url.startsWith('chrome://')) {
                addMessage('Я не могу работать на системных страницах Chrome.', 'agent');
                return;
            }
            
            chrome.tabs.sendMessage(tabs[0].id, { action: 'execute_command', command: command }, (response) => {
                if (chrome.runtime.lastError) {
                    addMessage('Не удалось связаться со страницей. Перезагрузите вкладку и попробуйте снова.', 'agent');
                    console.error(chrome.runtime.lastError.message);
                } else if (response) {
                    if (response.status === 'success') {
                        addMessage(response.message, 'agent');
                    } else {
                        addMessage(response.message, 'agent');
                    }
                } else {
                     addMessage('Страница не ответила. Возможно, она еще загружается.', 'agent');
                }
            });
        });
    };

    executeBtn.addEventListener('click', executeCommand);
    commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            executeCommand();
        }
    });
});
