// Animated automation pipelines. Every [data-pipeline] element carries its scenarios as JSON
// (<script type="application/json" class="pl-data">[{"tab","label","steps":[[icon,title,detail,time],...]}]</script>).
// A glowing pulse travels along the path and each step "powers on" in its own colour when the pulse reaches it.
// The path is drawn from the real icon positions, so the same code runs horizontally on desktop and vertically on
// mobile. Pauses off-screen; with reduced motion every step is simply shown as done.
(() => {
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
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z"/><path d="m8.8 12 2.3 2.3 4.1-4.6"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5s1.1-5.9 3.5-8.5z"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    cart: '<path d="M3 4h2.5l2.2 10.5h10.8L20.5 7H6.6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  };
  const COLORS = ['#d9f86e', '#8ef5c8', '#7cc8ff', '#b8a6ff', '#ffc978'];
  const SEG_MS = 1050, HOLD_MS = 2800, PULSE = 90;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let uid = 0;

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => 'rgb(' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t)).join(',') + ')';
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function pipeline(root) {
    const SCENARIOS = JSON.parse(root.querySelector('.pl-data').textContent);
    const id = 'pl' + uid++;
    const track = root.querySelector('.pl-track'), list = root.querySelector('.pl-steps'), tablist = root.querySelector('.pl-tabs');
    track.insertAdjacentHTML('afterbegin', `<svg class="pl-svg" aria-hidden="true" preserveAspectRatio="none"><defs>
      <linearGradient id="${id}lit" gradientUnits="userSpaceOnUse">${COLORS.map((c, i) => `<stop offset="${i / (COLORS.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>
      <linearGradient id="${id}comet" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d9f86e" stop-opacity="0"/><stop offset=".72" stop-color="#d9f86e"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
      <filter id="${id}glow" filterUnits="userSpaceOnUse" x="-200" y="-200" width="5000" height="5000"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs><path class="pl-base"/><path class="pl-lit" stroke="url(#${id}lit)"/><path class="pl-comet" stroke="url(#${id}comet)" filter="url(#${id}glow)"/></svg>`);
    const svg = track.querySelector('.pl-svg'), base = svg.querySelector('.pl-base'), lit = svg.querySelector('.pl-lit'), comet = svg.querySelector('.pl-comet');
    const litGrad = svg.querySelector(`#${id}lit`), cometGrad = svg.querySelector(`#${id}comet`), cometStops = cometGrad.querySelectorAll('stop');
    if (!list.id) list.id = id + 'steps';
    if (!track.id) track.id = id + 'panel';
    if (tablist && SCENARIOS.length > 1 && !tablist.children.length) {
      SCENARIOS.forEach(s => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-controls', track.id);
        b.textContent = s.tab;
        tablist.append(b);
      });
    }
    const tabs = tablist ? [...tablist.querySelectorAll('[role=tab]')] : [];
    if (tabs.length) {
      track.setAttribute('role', 'tabpanel');
      tabs.forEach(t => t.setAttribute('aria-controls', track.id));
    }
    let scenario = 0, pts = [], cum = [], total = 1, run = 0, visible = false, started = false;
    // WCAG 2.2.2: auto-play runs through the scenarios once, then stops; a button pauses or replays it
    let paused = false, finished = false, remaining = SCENARIOS.length;
    const ctrl = document.createElement('button');
    ctrl.type = 'button';
    ctrl.className = 'pl-ctrl';
    const setCtrl = () => {
      const play = paused || finished;
      ctrl.textContent = play ? '▶ Play' : '❚❚ Pause';
      ctrl.setAttribute('aria-label', play ? 'Play the automation animation' : 'Pause the automation animation');
    };
    ctrl.addEventListener('click', () => {
      if (finished) { finished = false; paused = false; remaining = 1; play(); } else paused = !paused;
      setCtrl();
    });
    root.querySelector('.pl-head').append(ctrl);
    setCtrl();

    function render() {
      const { label, steps } = SCENARIOS[scenario];
      list.setAttribute('aria-label', label);
      list.replaceChildren(...steps.map(([icon, title, detail, time], i) => {
        const li = document.createElement('li');
        li.className = 'pl-step';
        li.style.setProperty('--accent', COLORS[i % COLORS.length]);
        li.innerHTML = `<span class="pl-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon] || ICONS.sparkle}</svg></span><span class="pl-time mono"></span><strong class="pl-title"></strong><span class="pl-detail mono"></span>`;
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
      total = cum[cum.length - 1] || 1;
      const [a, z] = [pts[0], pts[pts.length - 1]];
      litGrad.setAttribute('x1', a[0]); litGrad.setAttribute('y1', a[1]); litGrad.setAttribute('x2', z[0]); litGrad.setAttribute('y2', z[1]);
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

    function draw(s, seg, f) {
      lit.style.strokeDashoffset = total - s;
      comet.style.strokeDashoffset = PULSE - s;
      const tail = pointAt(s - PULSE), head = pointAt(s);
      cometGrad.setAttribute('x1', tail[0]); cometGrad.setAttribute('y1', tail[1]); cometGrad.setAttribute('x2', head[0]); cometGrad.setAttribute('y2', head[1]);
      const c = mix(COLORS[seg % COLORS.length], COLORS[(seg + 1) % COLORS.length], f);
      cometStops[0].setAttribute('stop-color', c);
      cometStops[1].setAttribute('stop-color', c);
    }

    function showDone() {
      layout();
      draw(total, Math.max(0, pts.length - 2), 1);
      comet.style.opacity = 0;
      [...list.children].forEach(s => s.classList.add('is-active'));
    }

    function play() {
      const my = ++run;
      render();
      if (reduce.matches) { finished = true; setCtrl(); requestAnimationFrame(showDone); return; }
      requestAnimationFrame(() => {
        if (my !== run) return;
        layout();
        lit.style.strokeDashoffset = total;
        comet.style.opacity = 1;
        const nodes = [...list.children];
        nodes[0].classList.add('is-active');
        const travel = (pts.length - 1) * SEG_MS;
        let elapsed = 0, last = null;
        const tick = ts => {
          if (my !== run) return;
          if (last !== null && visible && !paused) elapsed += Math.min(64, ts - last);
          last = ts;
          if (elapsed < travel) {
            const raw = elapsed / SEG_MS, seg = Math.min(pts.length - 2, Math.floor(raw)), f = ease(raw - seg);
            draw(cum[seg] + (cum[seg + 1] - cum[seg]) * f, seg, f);
            for (let k = 1; k < nodes.length; k++) if (elapsed >= k * SEG_MS - 60) nodes[k].classList.add('is-active');
          } else {
            draw(total, pts.length - 2, 1);
            nodes.forEach(n => n.classList.add('is-active'));
            comet.style.opacity = 0;
            if (elapsed >= travel + HOLD_MS) {
              if (--remaining <= 0) { finished = true; setCtrl(); return; }
              scenario = (scenario + 1) % SCENARIOS.length;
              play();
              return;
            }
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { scenario = i; remaining = 1; finished = paused = false; setCtrl(); play(); });
      t.addEventListener('keydown', e => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!k) return;
        e.preventDefault();
        scenario = (i + k + tabs.length) % tabs.length;
        remaining = 1; finished = paused = false; setCtrl();
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
    // until the pipeline scrolls into view, show the finished state (also the no-motion fallback)
    render();
    requestAnimationFrame(showDone);
  }

  document.querySelectorAll('[data-pipeline]').forEach(pipeline);
})();
