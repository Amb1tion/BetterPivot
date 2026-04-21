const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

chrome.storage.local.get({ resizeEnabled: true }, ({ resizeEnabled }) => {
  toggle.checked = resizeEnabled;
  status.textContent = resizeEnabled ? 'Enabled' : 'Disabled';
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  status.textContent = enabled ? 'Enabled' : 'Disabled';

  chrome.storage.local.set({ resizeEnabled: enabled });

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) chrome.tabs.sendMessage(tab.id, { type: 'BP_RESIZE_TOGGLE', enabled });
  });
});
