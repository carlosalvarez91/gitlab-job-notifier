document.getElementById('notify-button').addEventListener('click', () => {
    console.log('click')
     // Send the message to start the interval
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log(tabs[0].id)
        chrome.tabs.sendMessage(tabs[0].id, { init: true });
    });
});

// Listen for messages to handle status updates
chrome.runtime.onMessage.addListener((message) => {
    if (message.jobFound === false) {
        const info = document.getElementById('info');
        info.textContent = "No running job found.";
        info.style.color = "red";
    }
    else if (message.jobFound) {
        console.log(message)
        const info = document.getElementById('info');
        info.style.color = "#0052ffee";
        info.textContent = `Monitoring Job: ${message.jobTitle}`;
    }
    else if (message.jobFinished) {
        console.log(message)
        const info = document.getElementById('info');
        info.style.color = "green";
        info.textContent = `Job finished: ${message.jobTitle}`;
    }
});