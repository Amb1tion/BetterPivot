console.log('back.js injected at:', location.href);

window.addEventListener('message', (e) => {
  if (e.data?.type === 'PIVOT_DEVICES') {
    const devices = JSON.parse(e.data.data);
    console.log('Devices data received:', devices);
  }
});
let lastHandled = null;
let deviceData = null; // Global variable to store device data for Excel export

function handleUrl(url) {
  if (url === lastHandled) return;
  if (url.match(/room-check/)) {
    lastHandled = url;
    console.log('Room check page detected!');
    injectRoomButton(url);
  }
  if (url.match(/devices/)){
    lastHandled = url;
    console.log('Devices page detected!');  
    injectDownloadExcelButton(url);//inject
  }
}

function buildRoomUrl(url) {
  const parsed = new URL(url);
  parsed.pathname = parsed.pathname.replace(/\/room-check\/[^/]+$/, '');
  parsed.searchParams.append('tab', '4');
  return parsed.toString();
}

function injectRoomButton(url) {
  const roomUrl = buildRoomUrl(url);

  function tryInject() {
    if (document.getElementById('pivot-room-btn')) return true;//button already exists
    const backBtn = Array.from(document.querySelectorAll('button[type="submit"]'))
      .find(b => b.textContent.trim() === 'Back');//find the back button on the page , there's two submit type buttons we want to target the one with text "Back"
    if (!backBtn) return false;//Back button on room check page doesn't exist yet
    const btn = document.createElement('a');
    btn.id = 'pivot-room-btn';
    btn.href = roomUrl;
    btn.className = backBtn.className;
    btn.textContent = 'Go to Room';
    backBtn.after(btn);
    return true;
  }

  if (tryInject()) return;

  const observer = new MutationObserver(() => {
    if (tryInject()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function injectDownloadExcelButton(url) 
{

    function tryInject() {
        if (document.getElementById('pivot-download-btn')) return true;//button already exists
        const SearchInput = document.getElementById('devicesSearch');
        if (!SearchInput) return false;//Search input on devices page doesn't exist yet
        const btn = document.createElement('button');
        btn.id = 'pivot-download-btn';
        btn.textContent = 'Download Excel';
        btn.className = 'download-btn';
        btn.addEventListener('click', () => {
            ExportExcel();//function gather info from global parameters,ties together into a csv file and triggers a download
        });
        SearchInput.after(btn);
  }

  if (tryInject()) return;

  const observer = new MutationObserver(() => {
    if (tryInject()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof module !== 'undefined') {
  module.exports = { buildRoomUrl, handleUrl, injectRoomButton, injectDownloadExcelButton };
} else {
  handleUrl(location.href);
  navigation.addEventListener('navigate', (event) => {
    handleUrl(event.destination.url);
  });
}