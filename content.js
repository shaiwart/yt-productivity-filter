function extractVideoId(url) {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search);
    return params.get('v');
}

function isChannelAllowed(channelName) {
    return new Promise((resolve) => {
        chrome.storage.local.get("groups", (data) => {
            const groups = data.groups || [];
            const activeChannels = groups
                .filter(group => group.isActive)
                .flatMap(group => group.channels);

            const allowed = activeChannels.some(ch =>
                ch.toLowerCase() === channelName.toLowerCase()
            );

            resolve(allowed);
        });
    });
}

function fetchChannelName(videoId) {
    const apiKey = 'AIzaSyBOOp7hzXYyFnK0QGNiJGT0EjYsQTYdviE';
    return fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(data => {
            if (data.items.length > 0) {
                return data.items[0].snippet.channelTitle;
            }
            return null;
        });
}

function incrementBlockCount() {
    chrome.storage.local.get(['totalBlockCount'], function (result) {
        const count = (result.totalBlockCount || 0) + 1;
        chrome.storage.local.set({ totalBlockCount: count });
    });
}

function handleWatchPage(videoId) {
    chrome.storage.local.get(['activateFilter'], function (result) {
        if (result.activateFilter !== true) return;

        fetchChannelName(videoId)
            .then(channelName => {
                if (!channelName) {
                    console.log('Video not found');
                    return;
                }
                console.log("channelName", channelName);
                isChannelAllowed(channelName).then((isAllowed) => {
                    if (!isAllowed) {
                        incrementBlockCount();
                        window.location.href = 'blocked.html';
                    }
                });
            })
            .catch(error => console.error('Error:', error));
    });
}

function handleShortsPage() {
    chrome.storage.local.get(['activateFilter', 'blockShorts'], function (result) {
        if (result.activateFilter === true && result.blockShorts === true) {
            incrementBlockCount();
            window.location.href = 'blocked.html';
        }
    });
}

function enforceFilter() {
    const pageUrl = window.location.href;

    if (pageUrl.includes("/watch")) {
        handleWatchPage(extractVideoId(pageUrl));
    } else if (pageUrl.includes("/shorts") && !pageUrl.includes("/blocked")) {
        handleShortsPage();
    }
}

function observeUrlChanges() {
    let lastUrl = window.location.href;

    const observer = new MutationObserver(() => {
        const currentUrl = window.location.href;

        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            enforceFilter();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

enforceFilter();
observeUrlChanges();
