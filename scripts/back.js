console.log('back.js injected at:', location.href);

let lastHandled = null;
let deviceData = null;

window.addEventListener('message', (e) => {
  if (e.data?.type === 'PIVOT_DEVICES') {
    const parsed = JSON.parse(e.data.data);
    deviceData = parsed.data;
    console.log(`Devices data received: ${deviceData.length} devices`);
  }
});

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
        if (document.getElementById('pivot-download-btn')) return true;
        const SearchInput = document.getElementById('devicesSearch');
        if (!SearchInput) return false;

        if (!document.getElementById('pivot-styles')) {
          const style = document.createElement('style');
          style.id = 'pivot-styles';
          style.textContent = `
            #pivot-download-btn {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 6px 14px;
              font-size: 14px;
              font-family: inherit;
              border: 1px solid #b0c4b0;
              border-radius: 6px;
              background: #fff;
              color: #3a5a3a;
              cursor: pointer;
              transition: background 0.15s, border-color 0.15s;
            }
            #pivot-download-btn:hover { background: #edf4ed; border-color: #7aaa7a; }
            #pivot-download-btn:active { background: #d6ead6; }
          `;
          document.head.appendChild(style);
        }

        const btn = document.createElement('button');
        btn.id = 'pivot-download-btn';
        btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download Asset List`;
        btn.addEventListener('click', ExportExcel);
        const searchContainer = SearchInput.closest('div');
        searchContainer.style.display = 'flex';
        searchContainer.style.alignItems = 'center';
        searchContainer.style.gap = '8px';
        searchContainer.appendChild(btn);
        return true;
  }

  if (tryInject()) return;

  const observer = new MutationObserver(() => {
    if (tryInject()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function csvCell(value) {
  if (value == null) return '';
  const str = String(value);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function ExportExcel() {
  if (!deviceData?.length) {
    alert('No device data available yet. Wait for the page to finish loading.');
    return;
  }

  const headers = [
    'Floor Name', 'Floor Number', 'Room Type', 'Room Name', 'Room Number',
    'Part Number', 'Model Category', 'Manufacturer', 'Device Name', 'Serial Number',
    'Description', 'MAC1', 'MAC2', 'MAC3', 'IP1', 'IP2', 'IP3',
    'CresnetID', 'IPID', 'ProjectNumber', 'VLANName', 'SwitchPort', 'RS232Port',
    'IRPort', 'LANType', 'InstallationDate', 'InstalledPlace', 'InstalledFirmware', 'Comments'
  ];

  const rows = deviceData.map(d => [
    d.room?.floor?.name,
    d.room?.floor?.number,
    d.room?.roomType?.type,
    d.room?.name,
    d.room?.number != null ? `'${d.room.number}` : null,//to deal with excel auto-formatting numbers as dates, we prepend a ' to force it to be text
    d.partNumber?.partNumber,
    d.category?.category,
    d.model?.manufacturer?.manufacturer,
    d.name,
    d.serialNumber,
    d.description,
    d.macAddress,
    d.macAddress2,
    d.macAddress3,
    d.ipAddress,
    d.ipAddress2,
    d.ipAddress3,
    d.cresnetId,
    d.ipId,
    d.projectNumber,
    d.vlanName,
    d.switchPort,
    d.rs232Port,
    d.irPort,
    d.vlanType,
    d.installationDate,
    d.installedPlace,
    d.installedFirmwareVersion,
    d.comments,
  ].map(csvCell).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'AssetList.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

if (typeof module !== 'undefined') {
  module.exports = { buildRoomUrl, handleUrl, injectRoomButton, injectDownloadExcelButton, ExportExcel, csvCell };
} else {
  handleUrl(location.href);
  navigation.addEventListener('navigate', (event) => {
    handleUrl(event.destination.url);
  });
}