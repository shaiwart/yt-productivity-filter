// Function to gather data from the current page
function extractVideoId(url) {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search);
    return params.get('v'); // Returns the video ID
}

function isChannelAllowed(channelName) {
    return new Promise((resolve) => {
        chrome.storage.local.get("allowedChannels", (data) => {
            const allowedChannelsList = data.allowedChannels || [];
            console.log("allowed_channel_list_in_content.js", allowedChannelsList);

            // Perform case-insensitive comparison
            const allowed = allowedChannelsList.some(allowedChannel => 
                allowedChannel.toLowerCase() === channelName.toLowerCase()
            );
            
            resolve(allowed);
        });
    });
}



function gatherData() {
    const pageUrl = window.location.href;
    const videoId = extractVideoId(pageUrl);
    const apiKey = 'AIzaSyBOOp7hzXYyFnK0QGNiJGT0EjYsQTYdviE';

    if (pageUrl.includes("/watch")) {
        // check if filter is activated in the UI by user or not
        chrome.storage.local.get(['activateFilter'], function(result) {
            if(result.activateFilter === true) {
                fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.items.length > 0) {
                        const channelName = data.items[0].snippet.channelTitle;
                        console.log("channelName", channelName);
                        
                        isChannelAllowed(channelName).then((allowed) => {
                            if (!allowed) {
                                // window.location.href = chrome.runtime.getURL("blocked.html");
                                window.location.href = 'blocked.html';
                            }
                        });
                    } else {
                        console.log('Video not found');
                    }
                })
                .catch(error => console.error('Error:', error));
            }
            else {
                // don't do anything
            }
        });
    }
    else if (pageUrl.includes("/shorts") && !pageUrl.includes("/blocked")) {
        chrome.storage.local.get(['activateFilter'], function(result) {
            if(result.activateFilter === true) {
                // block shorts if blockShort = true
                chrome.storage.local.get(['blockShorts'], function(result) {
                    if(result.blockShorts === true) {
                        window.location.href = 'blocked.html';
                    }
                });
            }
            else {
                // don't do anything
            }
        });
        // https://www.youtube.com/shorts/blocked.html
        // window.location.href = chrome.runtime.getURL("blocked.html");
    }
}

// Function to observe and detect URL changes or DOM changes
function observePageChanges() {
    let lastUrl = window.location.href;

    const observer = new MutationObserver(() => {
        const currentUrl = window.location.href;

        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            gatherData();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Initial data gathering and page observation
gatherData();
observePageChanges();
