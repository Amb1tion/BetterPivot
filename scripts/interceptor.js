const DEVICES_URL = 'https://api.app.pivotnow.io/v1/devices?';

// Intercept fetch, get the response data for the devices API call, and send to back.js
const _fetch = window.fetch;
window.fetch = async function(...args) {
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
  const response = await _fetch.apply(this, args);
  if (url?.startsWith(DEVICES_URL)) {
    response.clone().text().then(body => {
      window.postMessage({ type: 'PIVOT_DEVICES', data: body }, '*');
    });
  }
  return response;
};

// Intercept XHR as fallback
const _open = XMLHttpRequest.prototype.open;
const _send = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url) {
  this._url = url;
  return _open.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(body) {
  this.addEventListener('load', function() {
    if (this._url?.startsWith(DEVICES_URL)) {
      window.postMessage({ type: 'PIVOT_DEVICES', data: this.responseText }, '*');
    }
  });
  return _send.apply(this, arguments);
};
