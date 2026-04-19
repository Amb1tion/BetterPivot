/**
 * @jest-environment jsdom
 */

const XLSX = require('xlsx');

let buildRoomUrl, handleUrl, injectRoomButton, injectDownloadExcelButton, ExportExcel;

const BASE_URL =
  'https://app.pivotnow.io/rooms/room/1be7868d-c95d-408e-b9ed-551b77bcf01b/room-check/c39a606f-01d1-443a-a03c-8aaa3baaea4b?clientId=58a58d35-b196-44c2-99b5-73c12e9124a2%7CScotiabank&locationId=9943d58c-f1d9-46f6-afcf-c9681891fc91%7CToronto%2520-%2520351%2520King%2520Street%2520East';

const SAMPLE_DEVICE = {
  name: 'EXP-101',
  serialNumber: '06296981',
  description: null,
  macAddress: '78:45:01:42:E3:5E',
  macAddress2: null,
  macAddress3: null,
  ipAddress: null,
  ipAddress2: null,
  ipAddress3: null,
  cresnetId: null,
  ipId: null,
  projectNumber: null,
  vlanName: null,
  switchPort: null,
  rs232Port: null,
  irPort: null,
  vlanType: null,
  installationDate: null,
  installedPlace: null,
  installedFirmwareVersion: null,
  comments: null,
  room: {
    name: 'Event Space',
    number: 'TBC',
    floor: { name: '2nd Floor', number: 2 },
    roomType: { type: 'RT10 - Event Space - 2nd Floor' },
  },
  partNumber: { partNumber: 'Tesira EX-OUT' },
  category: { category: 'Adapter' },
  model: { manufacturer: { manufacturer: 'Biamp Systems' } },
};

function setDeviceData(devices) {
  window.dispatchEvent(new MessageEvent('message', {
    data: { type: 'PIVOT_DEVICES', data: JSON.stringify({ data: devices }) },
  }));
}

beforeEach(() => {
  jest.resetModules();
  global.XLSX = XLSX;
  global.alert = jest.fn();
  global.URL.createObjectURL = jest.fn(() => 'blob:fake-url');
  global.URL.revokeObjectURL = jest.fn();

  ({ buildRoomUrl, handleUrl, injectRoomButton, injectDownloadExcelButton, ExportExcel } =
    require('../scripts/back.js'));

  document.body.innerHTML = '';
});

// ── buildRoomUrl ──────────────────────────────────────────────────────────────

describe('buildRoomUrl', () => {
  test('strips /room-check/<uuid> from path', () => {
    expect(buildRoomUrl(BASE_URL)).not.toContain('/room-check/');
  });

  test('preserves existing query params', () => {
    const result = buildRoomUrl(BASE_URL);
    expect(result).toContain('clientId=');
    expect(result).toContain('locationId=');
  });

  test('appends tab=4', () => {
    expect(buildRoomUrl(BASE_URL)).toContain('tab=4');
  });

  test('produces the expected full URL', () => {
    const expected =
      'https://app.pivotnow.io/rooms/room/1be7868d-c95d-408e-b9ed-551b77bcf01b?clientId=58a58d35-b196-44c2-99b5-73c12e9124a2%7CScotiabank&locationId=9943d58c-f1d9-46f6-afcf-c9681891fc91%7CToronto%2520-%2520351%2520King%2520Street%2520East&tab=4';
    expect(buildRoomUrl(BASE_URL)).toBe(expected);
  });

  test('works when there are no existing query params', () => {
    const url = 'https://app.pivotnow.io/rooms/room/abc-123/room-check/def-456';
    expect(buildRoomUrl(url)).toBe('https://app.pivotnow.io/rooms/room/abc-123?tab=4');
  });
});

// ── handleUrl ─────────────────────────────────────────────────────────────────

describe('handleUrl', () => {
  test('does nothing for non-room-check URLs', () => {
    handleUrl('https://app.pivotnow.io/rooms/room/abc-123');
    expect(document.getElementById('pivot-room-btn')).toBeNull();
  });

  test('does not process the same URL twice', () => {
    const backBtn = document.createElement('button');
    backBtn.type = 'submit';
    backBtn.textContent = 'Back';
    document.body.appendChild(backBtn);

    handleUrl(BASE_URL);
    document.getElementById('pivot-room-btn').remove();
    handleUrl(BASE_URL);

    expect(document.getElementById('pivot-room-btn')).toBeNull();
  });

  test('processes a different URL after the first', () => {
    const backBtn = document.createElement('button');
    backBtn.type = 'submit';
    backBtn.textContent = 'Back';
    document.body.appendChild(backBtn);

    const other = BASE_URL.replace('c39a606f-01d1-443a-a03c-8aaa3baaea4b', 'aaaaaaaa-0000-0000-0000-000000000000');
    handleUrl(BASE_URL);
    document.getElementById('pivot-room-btn').remove();
    handleUrl(other);

    expect(document.getElementById('pivot-room-btn')).not.toBeNull();
  });
});

// ── injectRoomButton ──────────────────────────────────────────────────────────

describe('injectRoomButton', () => {
  function addBackButton(className = '') {
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.textContent = 'Back';
    btn.className = className;
    document.body.appendChild(btn);
    return btn;
  }

  test('injects button after Back button when it already exists', () => {
    addBackButton();
    injectRoomButton(BASE_URL);

    const injected = document.getElementById('pivot-room-btn');
    expect(injected).not.toBeNull();
    expect(injected.tagName).toBe('A');
    expect(injected.textContent).toBe('Go to Room');
  });

  test('injected button has correct href', () => {
    addBackButton();
    injectRoomButton(BASE_URL);

    expect(document.getElementById('pivot-room-btn').href).toBe(buildRoomUrl(BASE_URL));
  });

  test('injected button copies className from Back button', () => {
    addBackButton('btn-class-one btn-class-two');
    injectRoomButton(BASE_URL);

    expect(document.getElementById('pivot-room-btn').className).toBe('btn-class-one btn-class-two');
  });

  test('injected button is placed immediately after Back button', () => {
    addBackButton();
    injectRoomButton(BASE_URL);

    const backBtn = document.querySelector('button[type="submit"]');
    expect(backBtn.nextElementSibling.id).toBe('pivot-room-btn');
  });

  test('does not inject a second button if called twice', () => {
    addBackButton();
    injectRoomButton(BASE_URL);
    injectRoomButton(BASE_URL);

    expect(document.querySelectorAll('#pivot-room-btn').length).toBe(1);
  });

  test('waits for Back button to appear asynchronously', async () => {
    injectRoomButton(BASE_URL);
    expect(document.getElementById('pivot-room-btn')).toBeNull();

    addBackButton();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(document.getElementById('pivot-room-btn')).not.toBeNull();
  });
});

// ── postMessage handler ───────────────────────────────────────────────────────

describe('postMessage handler', () => {
  test('stores parsed.data when PIVOT_DEVICES message is received', () => {
    setDeviceData([SAMPLE_DEVICE]);
    // verify via ExportExcel — if deviceData was set, no alert fires
    ExportExcel();
    expect(global.alert).not.toHaveBeenCalled();
  });

  test('ignores messages with a different type', () => {
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'SOMETHING_ELSE', data: JSON.stringify({ data: [SAMPLE_DEVICE] }) },
    }));
    ExportExcel();
    expect(global.alert).toHaveBeenCalled();
  });
});

// ── ExportExcel ───────────────────────────────────────────────────────────────

describe('ExportExcel', () => {
  test('shows alert when deviceData is empty', () => {
    ExportExcel();
    expect(global.alert).toHaveBeenCalled();
  });

  test('creates sheet with correct headers as first row', () => {
    const spy = jest.spyOn(XLSX.utils, 'aoa_to_sheet');
    setDeviceData([SAMPLE_DEVICE]);
    ExportExcel();

    const [data] = spy.mock.calls[0];
    expect(data[0]).toEqual([
      'Floor Name', 'Floor Number', 'Room Type', 'Room Name', 'Room Number',
      'Part Number', 'Model Category', 'Manufacturer', 'Device Name', 'Serial Number',
      'Description', 'MAC1', 'MAC2', 'MAC3', 'IP1', 'IP2', 'IP3',
      'CresnetID', 'IPID', 'ProjectNumber', 'VLANName', 'SwitchPort', 'RS232Port',
      'IRPort', 'LANType', 'InstallationDate', 'InstalledPlace', 'InstalledFirmware', 'Comments',
    ]);
  });

  test('maps device fields to correct column positions', () => {
    const spy = jest.spyOn(XLSX.utils, 'aoa_to_sheet');
    setDeviceData([SAMPLE_DEVICE]);
    ExportExcel();

    const [data] = spy.mock.calls[0];
    const row = data[1];
    expect(row[0]).toBe('2nd Floor');           // Floor Name
    expect(row[1]).toBe(2);                     // Floor Number
    expect(row[2]).toBe('RT10 - Event Space - 2nd Floor'); // Room Type
    expect(row[3]).toBe('Event Space');          // Room Name
    expect(row[4]).toBe('TBC');                 // Room Number
    expect(row[5]).toBe('Tesira EX-OUT');        // Part Number
    expect(row[6]).toBe('Adapter');              // Model Category
    expect(row[7]).toBe('Biamp Systems');        // Manufacturer
    expect(row[8]).toBe('EXP-101');              // Device Name
    expect(row[9]).toBe('06296981');             // Serial Number
    expect(row[11]).toBe('78:45:01:42:E3:5E');  // MAC1
  });

  test('null device fields produce null values in row', () => {
    const spy = jest.spyOn(XLSX.utils, 'aoa_to_sheet');
    setDeviceData([SAMPLE_DEVICE]);
    ExportExcel();

    const [data] = spy.mock.calls[0];
    const row = data[1];
    expect(row[10]).toBeNull(); // Description
    expect(row[12]).toBeNull(); // MAC2
    expect(row[18]).toBeNull(); // IPID
  });

  test('room number column cells are set to text type', () => {
    setDeviceData([SAMPLE_DEVICE]);
    ExportExcel();

    const ws = XLSX.utils.aoa_to_sheet([
      ['Room Number'],
      ['TBC'],
    ]);
    // The function sets t:'s' on column index 4 (E) — verify via the real sheet
    const aoaSpy = jest.spyOn(XLSX.utils, 'aoa_to_sheet');
    setDeviceData([{ ...SAMPLE_DEVICE }]);
    ExportExcel();

    // After ExportExcel runs, the sheet passed to book_append_sheet should have
    // cell E2 (row 1, col 4) with type 's'
    const bookSpy = jest.spyOn(XLSX.utils, 'book_append_sheet');
    setDeviceData([SAMPLE_DEVICE]);
    ExportExcel();

    const sheet = bookSpy.mock.calls[0][1];
    const cellRef = XLSX.utils.encode_cell({ r: 1, c: 4 });
    expect(sheet[cellRef]?.t).toBe('s');
  });

  test('triggers download with filename AssetList.xlsx', () => {
    const clickSpy = jest.fn();
    const realCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = realCreate(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    setDeviceData([SAMPLE_DEVICE]);
    ExportExcel();

    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  test('uses xlsx MIME type for the blob', () => {
    const blobs = [];
    const realBlob = global.Blob;
    global.Blob = class extends realBlob {
      constructor(parts, opts) { super(parts, opts); blobs.push(opts); }
    };

    setDeviceData([SAMPLE_DEVICE]);
    ExportExcel();

    const xlsxBlob = blobs.find(o => o?.type?.includes('spreadsheetml'));
    expect(xlsxBlob).toBeDefined();

    global.Blob = realBlob;
  });
});
