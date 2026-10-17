// Animated automation pipeline: a glowing pulse travels along the path and each step "powers on" in its own colour
// when the pulse reaches it. The path is drawn from the real icon positions, so the same code runs horizontally on
// desktop and vertically on mobile. Pauses off-screen; with reduced motion every step is simply shown as done.
(() => {
  const root = document.querySelector('[data-pipeline]');
  if (!root) return;

  const ICONS = {
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    stack: '<path d="M12 3 3 7.5l9 4.5 9-4.5z"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/>',
    message: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>',
    sparkle: '<path d="M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5-1.9-5.5-5.6-2 5.6-2z"/><path d="M19 3v4M21 5h-4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/>',
    code: '<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15"/>',
    chat: '<path d="M4 12a8 7 0 1 1 3.4 5.8L3.5 19l1.3-3.6A6.8 6.8 0 0 1 4 12z"/><path d="M9 11.5h.01M12 11.5h.01M15 11.5h.01"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="m7.5 15 4-4 3 3 5-6"/>',
  };
  const COLORS = ['#d9f86e', '#8ef5c8', '#7cc8ff', '#b8a6ff', '#ffc978'];
  const SCENARIOS = [
    ['Order paid automation', [
      ['card', 'Order paid', 'Shopify · #1042 · $189.00', '0.0s'], ['receipt', 'Invoice created', 'Xero · INV-1042', '0.6s'],
      ['box', 'Label printed', 'Australia Post · eParcel', '1.3s'], ['stack', 'Stock updated', 'Inventory · 23 → 22', '1.9s'],
      ['message', 'Customer notified', 'Email + SMS · tracking link', '2.4s']]],
    ['New enquiry automation', [
      ['mail', 'Enquiry received', 'Website form · fit-out quote', '0.0s'], ['users', 'Deal created', 'HubSpot · stage: new lead', '0.5s'],
      ['sparkle', 'Reply drafted', 'AI assistant · ready for review', '1.8s'], ['calendar', 'Follow-up booked', 'Calendar · Tue 10:00', '2.2s'],
      ['bell', 'Team notified', 'Slack · #sales', '2.5s']]],
    ['Price change automation', [
      ['tag', 'Price changed', 'Store admin · $249 → $219', '0.0s'], ['refresh', 'Feeds refreshed', 'Google Merchant Center', '0.9s'],
      ['code', 'Product data updated', 'Product + Offer JSON-LD', '1.2s'], ['chat', 'Visible to AI assistants', 'ChatGPT · Gemini · Perplexity', '1.6s'],
      ['chart', 'Change tracked', 'GA4 · price test', '2.0s']]],
  ];
  const SEG_MS = 1050, HOLD_MS = 2800, PULSE = 90;

  const track = root.querySelector('.pl-track'), list = root.querySelector('.pl-steps');
  const svg = root.querySelector('.pl-svg'), base = svg.querySelector('.pl-base'), lit = svg.querySelector('.pl-lit'), comet = svg.querySelector('.pl-comet');
  const litGrad = svg.querySelector('#plLitGrad'), cometGrad = svg.querySelector('#plCometGrad'), cometStops = cometGrad.querySelectorAll('stop');
  const tabs = [...root.querySelectorAll('[role=tab]')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let scenario = 0, pts = [], cum = [], total = 0, run = 0, visible = false, started = false;

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => 'rgb(' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t)).join(',') + ')';
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function render() {
    const [label, steps] = SCENARIOS[scenario];
    list.setAttribute('aria-label', label);
    list.replaceChildren(...steps.map(([icon, title, detail, time], i) => {
      const li = document.createElement('li');
      li.className = 'pl-step';
      li.style.setProperty('--accent', COLORS[i]);
      li.innerHTML = `<span class="pl-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon]}</svg></span><span class="pl-time mono"></span><strong class="pl-title"></strong><span class="pl-detail mono"></span>`;
      li.querySelector('.pl-time').textContent = time;
      li.querySelector('.pl-title').textContent = title;
      li.querySelector('.pl-detail').textContent = detail;
      return li;
    }));
    tabs.forEach((t, i) => { t.setAttribute('aria-selected', String(i === scenario)); t.tabIndex = i === scenario ? 0 : -1; });
  }

  function layout() {
    const r = track.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    pts = [...list.querySelectorAll('.pl-icon')].map(n => { const b = n.getBoundingClientRect(); return [b.left - r.left + b.width / 2, b.top - r.top + b.height / 2]; });
    const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    [base, lit, comet].forEach(p => p.setAttribute('d', d));
    cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    total = cum[cum.length - 1];
    const [a, z] = [pts[0], pts[pts.length - 1]];
    litGrad.setAttribute('x1', a[0]); litGrad.setAttribute('y1', a[1]); litGrad.setAttribute('x2', z[0]); litGrad.setAttribute('y2', z[1]);
    litGrad.querySelectorAll('stop').forEach((s, i) => s.setAttribute('offset', (cum[i] / total).toFixed(4)));
    lit.style.strokeDasharray = `${total} ${total}`;
    comet.style.strokeDasharray = `${PULSE} ${total + PULSE}`;
  }

  function pointAt(d) {
    d = Math.max(0, Math.min(total, d));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
  }

  // s = distance of the pulse head along the path; seg/f = current segment and its progress (for the colour)
  function draw(s, seg, f) {
    lit.style.strokeDashoffset = total - s;
    comet.style.strokeDashoffset = PULSE - s;
    const tail = pointAt(s - PULSE), head = pointAt(s);
    cometGrad.setAttribute('x1', tail[0]); cometGrad.setAttribute('y1', tail[1]); cometGrad.setAttribute('x2', head[0]); cometGrad.setAttribute('y2', head[1]);
    const c = mix(COLORS[seg], COLORS[Math.min(seg + 1, COLORS.length - 1)], f);
    cometStops[0].setAttribute('stop-color', c);
    cometStops[1].setAttribute('stop-color', c);
  }

  const steps = () => [...list.children];

  function showDone() {
    layout();
    draw(total, COLORS.length - 2, 1);
    comet.style.opacity = 0;
    steps().forEach(s => s.classList.add('is-active'));
  }

  function play() {
    const my = ++run;
    render();
    if (reduce.matches) { requestAnimationFrame(showDone); return; }
    requestAnimationFrame(() => {
      if (my !== run) return;
      layout();
      lit.style.strokeDashoffset = total;
      comet.style.opacity = 1;
      const nodes = steps();
      nodes[0].classList.add('is-active');
      const travel = (pts.length - 1) * SEG_MS;
      let elapsed = 0, last = null;
      const tick = ts => {
        if (my !== run) return;
        if (last !== null && visible) elapsed += Math.min(64, ts - last);
        last = ts;
        if (elapsed < travel) {
          const raw = elapsed / SEG_MS, seg = Math.min(pts.length - 2, Math.floor(raw)), f = ease(raw - seg);
          draw(cum[seg] + (cum[seg + 1] - cum[seg]) * f, seg, f);
          for (let k = 1; k < nodes.length; k++) if (elapsed >= k * SEG_MS - 60) nodes[k].classList.add('is-active');
        } else {
          draw(total, pts.length - 2, 1);
          nodes.forEach(n => n.classList.add('is-active'));
          comet.style.opacity = 0;
          if (elapsed >= travel + HOLD_MS) { scenario = (scenario + 1) % SCENARIOS.length; play(); return; }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { scenario = i; play(); });
    t.addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!k) return;
      e.preventDefault();
      scenario = (i + k + tabs.length) % tabs.length;
      play();
      tabs[scenario].focus();
    });
  });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !started) { started = true; play(); }
  }, { threshold: 0.15 }).observe(root);

  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (started) layout(); }, 120); });
  reduce.addEventListener('change', () => started && play());
  // until the section scrolls into view, show the finished state (also the no-motion fallback)
  render();
  requestAnimationFrame(showDone);
})();
