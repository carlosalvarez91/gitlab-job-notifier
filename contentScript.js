(function () {
    console.log('content script injected');

    setTimeout(async () => {
        console.log('timeout');

        // Load the stored state
        let isRunning = (await chrome.storage.local.get(['isRunning'])).isRunning || false;
        console.log('isRunning', isRunning)
        let prevJob = (await chrome.storage.local.get(['prevJob'])).prevJob
        const jobLinks = document.querySelectorAll('a[data-testid="job-with-link"]');
        const currentJob = Array.from(jobLinks).find(link => link.title.includes('running'));
        console.log('jobLinks ...', jobLinks,'currentJob: ....', currentJob)
        let currentJobTitle;
        if (currentJob) {
            currentJobTitle = currentJob.getAttribute('title').split(' - ')[0];
        }

        if (isRunning) {
            chrome.runtime.sendMessage({ isRunning: true });
            monitorStatus();
        } else {
            chrome.runtime.sendMessage({ isRunning: false });
        }

        // Function to stop interval and clear state
        function stopMonitoring() {
            isRunning = false;
            chrome.storage.local.set({ isRunning: false });
            prevJob = null;
            chrome.storage.local.remove("prevJob", function() {
                console.log("Key 'prevJob' has been removed.");
            });
        }

        function passedOrFailed (title){
            const jobLink = document.querySelector(`a[title^="${title} - "]`);
            if (jobLink) {
                const jobTitle = jobLink.getAttribute('title');
                if (
                    jobTitle.includes('passed') ||
                    jobTitle.includes('failed')
                ) {
                    console.log('Job passed or failed')
                    return true;
                }
                console.log("Job in progress", jobTitle);
                return false;
            }
            return false;
        };

        // Function to start interval and store state
        function monitorStatus() {
            console.log('monitorStatus()')
            isRunning = true;
            chrome.storage.local.set({ isRunning: true });
            if (currentJob) {
                currentJobTitle = currentJob.getAttribute('title').split(' - ')[0];
                console.log('currentJob...',currentJob ,'jobTitle ..' , currentJobTitle)
                try {
                    chrome.runtime.sendMessage({ jobFound: true, jobTitle: currentJobTitle });
                } catch (e){
                    console.log(e)
                }
            }

            console.log('prevJob currentJob', prevJob, currentJob)
            // if !prevJob and !currentJob notFound OK
            if (!prevJob && !currentJob) { 
                console.log('not found')
                try {
                    chrome.runtime.sendMessage({ jobFound: false });
                } catch (e) {
                    console.log(e)
                }
                stopMonitoring()
                return;
            }

            // if prevJob === running and !currentJob, notify and remove prevJob
            if (prevJob && passedOrFailed(prevJob) && !currentJob) {
                try {
                    // notification
                    const audio = new Audio(chrome.runtime.getURL("./notification-sound.mp3"));
                    audio.play();
                    chrome.notifications.create({
                    type: 'basic',
                    title: 'Job Status Update',
                    message: 'The pipeline job has finished!',
                    priority: 2,
                    iconUrl: "./image.png",
                    });
                    chrome.runtime.sendMessage({ jobFinished: true, jobTitle: prevJob });
                } catch (e) {
                    console.log(e)
                }
                stopMonitoring()
                return;
            }

            // if !prevJob and currentJob === 'running' refresh and save currentJob as prevJob
            // if prevJob === running and currentJob === 'running', refresh
            if (!prevJob && currentJob || prevJob && currentJob) {
                setTimeout(() => {
                        chrome.storage.local.set({ prevJob: currentJobTitle });
                        location.reload();
                }, 10_000);
            }
        }

        // Listen for messages to start or stop the interval
        chrome.runtime.onMessage.addListener((message) => {
            console.log('onMessage', message)
            if (message.init === true) {
                monitorStatus();
            } else if (message.init === false) {
                stopMonitoring();
            }
        });
    }, 2_000); // wait 2 sec for doc to be fully loaded
})();


