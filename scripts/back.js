console.log('back.js injected at:', location.href);
let lastHandled = null;

function handleUrl(url) {
  if (url === lastHandled) return;
  if (url.match(/room-check/)) {
    lastHandled = url;
    console.log('Room check page detected!');
    injectRoomButton(url);
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
    if (document.getElementById('pivot-room-btn')) return true;
    const backBtn = Array.from(document.querySelectorAll('button[type="submit"]'))
      .find(b => b.textContent.trim() === 'Back');
    if (!backBtn) return false;
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

if (typeof module !== 'undefined') {
  module.exports = { buildRoomUrl, handleUrl, injectRoomButton };
} else {
  handleUrl(location.href);
  navigation.addEventListener('navigate', (event) => {
    handleUrl(event.destination.url);
  });
}