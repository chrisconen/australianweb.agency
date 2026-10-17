// Anonymous, cookieless counts for AWA (see privacy.html): page views and clicks on marked links, aggregated per day.
// Nothing is stored in the browser and no visitor id is sent. Honours Do Not Track and Global Privacy Control.
(() => {
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl || !/^(www\.)?australianweb\.agency$/.test(location.hostname)) {
    window.awaStat = () => {};
    return;
  }
  const END = 'https://api.australianweb.agency/e';
  const send = (e, l = '') => {
    const body = JSON.stringify({ e, p: location.pathname, r: document.referrer, l });
    if (!(navigator.sendBeacon && navigator.sendBeacon(END, new Blob([body], { type: 'text/plain' })))) {
      fetch(END, { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => {});
    }
  };
  window.awaStat = send;
  send('pageview');
  document.addEventListener('click', ev => {
    const a = ev.target.closest('a, button');
    if (!a) return;
    if (a.dataset.track) send(a.dataset.track, (a.dataset.trackLabel || a.textContent).trim().slice(0, 40));
    else if ((a.getAttribute('href') || '').startsWith('mailto:')) send('cta', 'email');
  }, { capture: true });
})();
