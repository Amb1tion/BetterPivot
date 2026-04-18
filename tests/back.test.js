/**
 * @jest-environment jsdom
 */

let buildRoomUrl, handleUrl, injectRoomButton;

const BASE_URL =
  'https://app.pivotnow.io/rooms/room/1be7868d-c95d-408e-b9ed-551b77bcf01b/room-check/c39a606f-01d1-443a-a03c-8aaa3baaea4b?clientId=58a58d35-b196-44c2-99b5-73c12e9124a2%7CScotiabank&locationId=9943d58c-f1d9-46f6-afcf-c9681891fc91%7CToronto%2520-%2520351%2520King%2520Street%2520East';

beforeEach(() => {
  jest.resetModules();
  ({ buildRoomUrl, handleUrl, injectRoomButton } = require('../scripts/back.js'));
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

// ── injectRoomButton DOM injection ────────────────────────────────────────────

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
