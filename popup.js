const REVIEW_PROMPT_BLOCK_THRESHOLD = 25;

// Function to render the allowed channels list in the popup
function renderAllowedChannels(channels) {
    const channelList = document.getElementById('allowed-channels');
    channelList.innerHTML = '';  // Clear existing list

    console.log("updated_channel:", channels);

    channels.forEach((channel) => {
        const listItem = document.createElement('li');
        listItem.classList.add('channel-item');
        listItem.textContent = channel;

        // Add a remove button next to each channel
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.style.marginLeft = '10px';
        removeBtn.addEventListener('click', () => {
            removeChannel(channel);  // Call remove by channel name
        });

        listItem.appendChild(removeBtn);
        channelList.appendChild(listItem);
    });
}

// Function to remove a channel by name
function removeChannel(channelName) {
    chrome.storage.local.get(['allowedChannels'], function (result) {
        const allowedChannelsList = result.allowedChannels || [];
        const updatedChannels = allowedChannelsList.filter(channel => channel !== channelName); // Filter out the specified channel

        chrome.storage.local.set({ allowedChannels: updatedChannels }, function () {
            renderAllowedChannels(updatedChannels); // Re-render the updated list
        });
    });
}

// Function to add a channel to the list
document.getElementById('add-channel').addEventListener('click', () => {
    const channelInput = document.getElementById('channel-input');
    const newChannel = channelInput.value.trim();

    if (!newChannel) return; // Don't proceed if input is empty

    chrome.storage.local.get(['allowedChannels'], function (result) {
        const channels = result.allowedChannels || [];

        // Add the new channel to the list if it isn't already there
        if (!channels.includes(newChannel)) {
            channels.push(newChannel);
            chrome.storage.local.set({ allowedChannels: channels }, function () {
                renderAllowedChannels(channels);  // Update the list in the UI
                channelInput.value = '';  // Clear the input after adding
            });
        }
    });
});


// Handle the YouTube Shorts toggle
function initShortsToggle() {
    const shortsToggle = document.getElementById('shorts-toggle');

    // Load the saved state of the toggle on load
    chrome.storage.local.get(['blockShorts'], function (result) {
        shortsToggle.checked = result.blockShorts || false;
    });

    // Listen for toggle changes and save the state
    shortsToggle.addEventListener('change', function () {
        chrome.storage.local.set({ blockShorts: shortsToggle.checked }, function () {
            console.log('YouTube Shorts blocking is now', shortsToggle.checked ? 'enabled' : 'disabled');
        });
    });
}


// Handle the overall video blocking toggle
function initFilterToggle() {
    const activateFilterToggle = document.getElementById('activate-filter-toggle');

    // Load the saved state of the toggle on load
    chrome.storage.local.get(['activateFilter'], function (result) {
        activateFilterToggle.checked = result.activateFilter || false;
    });

    // Listen for toggle changes and save the state
    activateFilterToggle.addEventListener('change', function () {
        chrome.storage.local.set({ activateFilter: activateFilterToggle.checked }, function () {
            console.log('YouTube Filter is now', activateFilterToggle.checked ? 'enabled' : 'disabled');
        });
    });
}

// Listen for Enter key press on the input field
document.getElementById('channel-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const channelInput = document.getElementById('channel-input');
        const newChannel = channelInput.value.trim();
        if (!newChannel) return; // Don't proceed if input is empty

        chrome.storage.local.get(['allowedChannels'], function (result) {
            const channels = result.allowedChannels || [];

            // Add the new channel to the list if it isn't already there
            if (!channels.includes(newChannel)) {
                channels.push(newChannel);
                chrome.storage.local.set({ allowedChannels: channels }, function () {
                    renderAllowedChannels(channels);  // Update the list in the UI
                    channelInput.value = '';  // Clear the input after adding
                });
            }
        });
    }
});

function checkAndShowReviewPrompt() {
    chrome.storage.local.get(['totalBlockCount', 'reviewPromptDismissed',
        'reviewPromptDismissedAtCount'], function (result) {
            const count = result.totalBlockCount || 0;
            if (result.reviewPromptDismissed) return;
            if (count < REVIEW_PROMPT_BLOCK_THRESHOLD) return;
            if (result.reviewPromptDismissedAtCount && count < result.reviewPromptDismissedAtCount + REVIEW_PROMPT_BLOCK_THRESHOLD) return;

            document.getElementById('review-prompt').style.display = 'block';
        });
}

function handleReviewPrompt() {
    const STORE_URL = 'https://chromewebstore.google.com/detail/youtube-productivity-filt/cnnlfgmdjmmhpaflfjcooibmaekgdika/reviews';

    document.getElementById('review-rate-btn').addEventListener('click', () => {
        chrome.storage.local.set({ reviewPromptDismissed: true });
        document.getElementById('review-prompt').style.display = 'none';
        window.open(STORE_URL, '_blank');
    });

    document.getElementById('review-later-btn').addEventListener('click', () => {
        chrome.storage.local.get(['totalBlockCount'], function (result) {
            chrome.storage.local.set({
                reviewPromptDismissedAtCount: result.totalBlockCount || 0
            });
            document.getElementById('review-prompt').style.display = 'none';
        });
    });

    document.getElementById('review-never-btn').addEventListener('click', () => {
        chrome.storage.local.set({ reviewPromptDismissed: true });
        document.getElementById('review-prompt').style.display = 'none';
    });
}

// On page load, display the current list of allowed channels
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['allowedChannels'], function (result) {
        const storedChannels = result.allowedChannels || [];
        renderAllowedChannels(storedChannels);  // Render the current channels list
    });

    initShortsToggle();
    initFilterToggle();

    checkAndShowReviewPrompt();
    handleReviewPrompt();
});
