const REVIEW_PROMPT_BLOCK_THRESHOLD = 25;

function generateId() {
    return 'group_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ---- Storage helpers ----

function loadGroups(callback) {
    chrome.storage.local.get(['groups'], (result) => {
        callback(result.groups || []);
    });
}

function saveGroups(groups, callback) {
    chrome.storage.local.set({ groups }, callback);
}

// ---- Migration from old allowedChannels flat array ----

function migrateIfNeeded(callback) {
    chrome.storage.local.get(['allowedChannels', 'groups'], (result) => {
        if (result.groups) {
            callback();
            return;
        }
        const defaultGroup = {
            id: 'group_default',
            name: 'Default',
            isActive: true,
            channels: result.allowedChannels || []
        };
        chrome.storage.local.set({ groups: [defaultGroup] }, () => {
            chrome.storage.local.remove('allowedChannels', callback);
        });
    });
}

// ---- Group operations ----

function createGroup(name) {
    loadGroups((groups) => {
        groups.push({ id: generateId(), name, isActive: false, channels: [] });
        saveGroups(groups, () => renderGroups(groups));
    });
}

function toggleGroup(id) {
    loadGroups((groups) => {
        const group = groups.find(g => g.id === id);
        if (group) group.isActive = !group.isActive;
        saveGroups(groups, () => renderGroups(groups));
    });
}

function renameGroup(id, newName) {
    loadGroups((groups) => {
        const group = groups.find(g => g.id === id);
        if (group) group.name = newName;
        saveGroups(groups, () => renderGroups(groups));
    });
}

function addChannelToGroup(groupId, channelName) {
    loadGroups((groups) => {
        const group = groups.find(g => g.id === groupId);
        if (group && !group.channels.includes(channelName)) {
            group.channels.push(channelName);
            saveGroups(groups, () => renderGroups(groups));
        }
    });
}

function removeChannelFromGroup(groupId, channelName) {
    loadGroups((groups) => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
            group.channels = group.channels.filter(ch => ch !== channelName);
            saveGroups(groups, () => renderGroups(groups));
        }
    });
}

function deleteGroup(id) {
    loadGroups((groups) => {
        const updated = groups.filter(g => g.id !== id);
        saveGroups(updated, () => renderGroups(updated));
    });
}

// ---- Rendering ----

function renderGroups(groups) {
    const container = document.getElementById('groups-container');
    container.innerHTML = '';

    groups.forEach((group) => {
        const card = document.createElement('div');
        card.classList.add('group-card');
        if (group.isActive) card.classList.add('group-active');

        // Header: inline rename input + toggle
        const header = document.createElement('div');
        header.classList.add('group-header');

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = group.name;
        nameInput.classList.add('group-name-input');
        nameInput.addEventListener('blur', () => {
            const newName = nameInput.value.trim();
            if (newName && newName !== group.name) {
                renameGroup(group.id, newName);
            }
        });
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') nameInput.blur();
        });

        const toggleLabel = document.createElement('label');
        toggleLabel.classList.add('toggle-switch');
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = group.isActive;
        toggleInput.addEventListener('change', () => toggleGroup(group.id));
        const slider = document.createElement('span');
        slider.classList.add('slider');
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(slider);

        header.appendChild(nameInput);
        header.appendChild(toggleLabel);

        if (group.id !== 'group_default') {
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.classList.add('delete-group-btn');
            deleteBtn.title = 'Delete group';
            deleteBtn.addEventListener('click', () => deleteGroup(group.id));
            header.appendChild(deleteBtn);
        }

        card.appendChild(header);

        // Channel list
        const channelList = document.createElement('ul');
        channelList.classList.add('allowed-channels');

        group.channels.forEach((channel) => {
            const li = document.createElement('li');
            li.classList.add('channel-item');

            const nameSpan = document.createElement('span');
            nameSpan.textContent = channel;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => removeChannelFromGroup(group.id, channel));

            li.appendChild(nameSpan);
            li.appendChild(removeBtn);
            channelList.appendChild(li);
        });

        card.appendChild(channelList);

        // Add channel row
        const addRow = document.createElement('div');
        addRow.classList.add('add-channel-row');

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter channel name';
        input.classList.add('channel-input');

        const addBtn = document.createElement('button');
        addBtn.textContent = 'Add';
        addBtn.classList.add('add-btn');

        const doAdd = () => {
            const val = input.value.trim();
            if (!val) return;
            addChannelToGroup(group.id, val);
            input.value = '';
        };

        addBtn.addEventListener('click', doAdd);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doAdd();
        });

        addRow.appendChild(input);
        addRow.appendChild(addBtn);
        card.appendChild(addRow);

        container.appendChild(card);
    });
}

// ---- New group button ----

function initNewGroupButton() {
    document.getElementById('new-group-btn').addEventListener('click', () => {
        const nameInput = document.getElementById('new-group-input');
        const name = nameInput.value.trim();
        if (!name) return;
        createGroup(name);
        nameInput.value = '';
    });

    document.getElementById('new-group-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('new-group-btn').click();
    });
}

// ---- Toggles ----

function initShortsToggle() {
    const shortsToggle = document.getElementById('shorts-toggle');
    chrome.storage.local.get(['blockShorts'], (result) => {
        shortsToggle.checked = result.blockShorts || false;
    });
    shortsToggle.addEventListener('change', () => {
        chrome.storage.local.set({ blockShorts: shortsToggle.checked });
    });
}

function initFilterToggle() {
    const activateFilterToggle = document.getElementById('activate-filter-toggle');
    chrome.storage.local.get(['activateFilter'], (result) => {
        activateFilterToggle.checked = result.activateFilter || false;
    });
    activateFilterToggle.addEventListener('change', () => {
        chrome.storage.local.set({ activateFilter: activateFilterToggle.checked });
    });
}

// ---- Review prompt ----

function checkAndShowReviewPrompt() {
    chrome.storage.local.get(['totalBlockCount', 'reviewPromptDismissed',
        'reviewPromptDismissedAtCount'], (result) => {
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
        chrome.storage.local.get(['totalBlockCount'], (result) => {
            chrome.storage.local.set({ reviewPromptDismissedAtCount: result.totalBlockCount || 0 });
            document.getElementById('review-prompt').style.display = 'none';
        });
    });

    document.getElementById('review-never-btn').addEventListener('click', () => {
        chrome.storage.local.set({ reviewPromptDismissed: true });
        document.getElementById('review-prompt').style.display = 'none';
    });
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
    migrateIfNeeded(() => {
        loadGroups((groups) => {
            if (groups.length === 0) {
                const defaultGroup = { id: 'group_default', name: 'Default', isActive: true, channels: [] };
                saveGroups([defaultGroup], () => renderGroups([defaultGroup]));
            } else {
                renderGroups(groups);
            }
        });
    });

    initShortsToggle();
    initFilterToggle();
    initNewGroupButton();
    checkAndShowReviewPrompt();
    handleReviewPrompt();
});
