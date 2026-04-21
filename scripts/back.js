console.log('back.js injected at:', location.href);

let lastHandled = null;
let deviceData = null;

window.addEventListener('message', (e) => {//listens for device data request from pivot api server to DOM and saves it to variable deviceData
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

function buildRoomUrl(url) {//makes url for the room page to navigate to room checks tab
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

  const observer = new MutationObserver(() => {//observe dom changes to see if page has loaded and then inject go to room button
    if (tryInject()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function injectDownloadExcelButton(url) 
{

    function tryInject() {
        if (document.getElementById('pivot-download-btn')) return true;
        const SearchInput = document.getElementById('devicesSearch');//wait for search button to load in dom
        if (!SearchInput) return false;

        const style = document.createElement('style');
        style.id = 'pivot-styles';//create a style for the button
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

  const observer = new MutationObserver(() => {//observe dom changes to see if page has loaded and then inject download button
    if (tryInject()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
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
    'Hostname', 'CresnetID', 'IPID', 'ProjectNumber', 'VLANName', 'SwitchPort', 'RS232Port',
    'IRPort', 'LANType', 'InstallationDate', 'InstalledPlace', 'InstalledFirmware', 'Comments'
  ];

  const rows = deviceData.map(d => [
    d.room?.floor?.name        ?? null,
    d.room?.floor?.number      ?? null,
    d.room?.roomType?.type     ?? null,
    d.room?.name               ?? null,
    d.room?.number             ?? null,
    d.partNumber?.partNumber   ?? null,
    d.category?.category       ?? null,
    d.model?.manufacturer?.manufacturer ?? null,
    d.name                     ?? null,
    d.serialNumber             ?? null,
    d.description              ?? null,
    d.macAddress               ?? null,
    d.macAddress2              ?? null,
    d.macAddress3              ?? null,
    d.ipAddress                ?? null,
    d.ipAddress2               ?? null,
    d.ipAddress3               ?? null,
    d.hostname                 ?? null,
    d.cresnetId                ?? null,
    d.ipId                     ?? null,
    d.projectNumber            ?? null,
    d.vlanName                 ?? null,
    d.switchPort               ?? null,
    d.rs232Port                ?? null,
    d.irPort                   ?? null,
    d.vlanType                 ?? null,
    d.installationDate         ?? null,
    d.installedPlace           ?? null,
    d.installedFirmwareVersion ?? null,
    d.comments                 ?? null,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Force Room Number column (index 4, column E) to text so Excel doesn't reformat values
  const roomNumberCol = 4;
  rows.forEach((_, i) => {
    const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: roomNumberCol });
    if (ws[cellRef]) ws[cellRef].t = 's';
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asset List');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'AssetList.xlsx';
  a.click();
  URL.revokeObjectURL(a.href);
}

if (typeof module !== 'undefined') {
  module.exports = { buildRoomUrl, handleUrl, injectRoomButton, injectDownloadExcelButton, ExportExcel };
} else {
  handleUrl(location.href);
  navigation.addEventListener('navigate', (event) => {
    handleUrl(event.destination.url);
  });
}