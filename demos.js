(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (root, selector) => root.querySelector(selector);
  const all = (root, selector) => [...root.querySelectorAll(selector)];
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const money = n => 'A$' + Math.round(n).toLocaleString('en-AU');
  let serial = 0;
  function clock(root) {
    let visible = false, frame = 0, last = 0;
    const jobs = new Set();
    function tick(now) {
      frame = 0;
      const dt = last ? now - last : 0;
      last = now;
      jobs.forEach(job => {
        job.time += dt;
        if (job.draw(job.time, false) === false) jobs.delete(job);
      });
      start();
    }
    function start() {
      if (visible && !document.hidden && !motion.matches && jobs.size && !frame) frame = requestAnimationFrame(tick);
    }
    function pause() { cancelAnimationFrame(frame); frame = 0; last = 0; }
    function complete() {
      if (!motion.matches) return;
      jobs.forEach(job => job.draw(Infinity, true));
      jobs.clear(); pause();
    }
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
      root.classList.toggle('dm-visible', visible);
      if (visible) start(); else pause();
    }, { threshold: [0, .25] });
    observer.observe(root);
    document.addEventListener('visibilitychange', () => { pause(); start(); });
    motion.addEventListener('change', complete);
    return {
      add(draw) {
        const job = { draw, time: 0 };
        if (motion.matches) draw(Infinity, true);
        else { jobs.add(job); start(); }
        return () => jobs.delete(job);
      },
      clear() { jobs.clear(); pause(); }
    };
  }
  function shell(root, dark, caption, html) {
    root.classList.add('dm-panel', dark ? 'dm-dark' : 'dm-light');
    root.innerHTML = html;
    root.append(el('p', 'dm-caption', caption));
  }
  function button(text, action, cls = '') {
    const b = el('button', 'dm-button ' + cls, text);
    b.type = 'button'; b.addEventListener('click', action); return b;
  }
  function toggle(host, labels, change) {
    host.setAttribute('role', 'group');
    const buttons = labels.map((label, i) => {
      const b = button(label, () => { select(i); change(i); });
      host.append(b); return b;
    });
    function select(index) { buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index))); }
    select(0); return select;
  }
  function chips(host, texts) { texts.forEach(text => host.append(el('span', 'dm-chip', text))); }
  function typeText(node, text, time, delay = 0) {
    const words = text.split(' ');
    node.textContent = words.slice(0, Math.max(0, Math.floor((time - delay) / 35))).join(' ');
    return time >= delay + words.length * 35;
  }
  function aiAnswer(root, c) {
    shell(root, true, 'Illustrative simulation of an AI assistant answer.', `
      <div class="dm-head"><span class="dm-label">AI discovery</span><span class="dm-chip">Example conversation</span></div>
      <p class="dm-bubble dm-user">Where can I buy an eco-friendly surfboard in Byron Bay?</p>
      <p class="dm-toggle-label">Your site, before and after an agent-readiness fix</p>
      <div class="dm-toggle" aria-label="Agent readiness comparison"></div>
      <div class="dm-answer" aria-live="polite" aria-atomic="true"><p class="dm-answer-text"></p><div class="dm-chips dm-sources"></div>
      <div class="dm-result" hidden><span class="dm-label">Recommended product</span><h3>Your Surf Store</h3><p>Eco Fish 6'2 · A$899 · In stock · Ships from Byron Bay</p><div class="dm-chips"><span class="dm-chip">yoursurfstore.example · product page</span><span class="dm-checkout" aria-hidden="true">Checkout in AI Mode ↗</span></div></div></div>`);
    const answer = "Two local options come up: Saltwater Board Co. stocks recycled-foam boards from A$780, and Byron Shapers makes custom eco boards to order. I couldn't find current prices or stock for other shops in the area.";
    const region = $(root, '.dm-answer'), result = $(root, '.dm-result');
    let manual = false, mode = 0;
    const select = toggle($(root, '.dm-toggle'), ['Before', 'After'], i => { manual = true; run(i); });
    chips($(root, '.dm-sources'), ['saltwaterboards.example', 'byronshapers.example']);
    function run(i) {
      c.clear(); mode = i; select(i); result.hidden = true;
      $(root, '.dm-sources').hidden = true; region.setAttribute('aria-busy', 'true');
      c.add((t, reduced) => {
        if (reduced && !manual) { mode = 1; select(1); }
        const done = typeText($(root, '.dm-answer-text'), answer, t);
        if (done) {
          region.setAttribute('aria-busy', 'false'); $(root, '.dm-sources').hidden = false;
          result.hidden = mode !== 1;
          result.style.boxShadow = mode === 1 && !reduced ? `0 0 ${Math.max(0, 24 * (1 - (t - answer.split(' ').length * 35) / 1000))}px #d9f86e38` : 'none';
        }
        if (reduced || (manual && t > 2600)) return false;
        if (!manual && t >= answer.split(' ').length * 35 + (mode ? 6500 : 3000)) { run(1 - mode); return false; }
      });
    }
    run(0);
  }
  function speedRace(root, c) {
    shell(root, true, 'Real measurement: Marina Yacht Sport (Europe), mobile, Google PageSpeed Insights, both versions tested the same morning in 2026.', `
      <div class="dm-head"><span class="dm-label">Mobile performance</span></div><div class="dm-phones"></div>`);
    const phones = [ ['Before rebuild', 4000, 69], ['After rebuild', 2400, 97] ].map(([title, lcp, score], i) => {
      const item = el('div', 'dm-phone-column');
      item.innerHTML = `<h3>${title}</h3><div class="dm-phone"><div class="dm-phone-top"><span>MARINA / SPORT</span><span>≡</span></div><div class="dm-phone-hero"><span>Made for<br>open water.</span><svg viewBox="0 0 240 120" aria-hidden="true"><path d="M20 95 Q120 75 220 95 L190 112 H55Z" fill="#f6f7f3"/><path d="M125 12 L125 84 L53 84Z" fill="#d9f86e"/><path d="M132 35 L181 84 H132Z" fill="#8ef5c8"/></svg></div><div class="dm-skeleton"></div><div class="dm-skeleton dm-short"></div><div class="dm-phone-cards"><i></i><i></i></div></div><div class="dm-speed-stats" aria-live="polite"><div><span class="dm-label">LCP</span><strong class="dm-timer">0.0 s</strong></div><div class="dm-gauge ${i ? 'dm-good' : 'dm-amber'}"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34"/><circle class="dm-gauge-fill" cx="40" cy="40" r="34" pathLength="100"/></svg><strong>0</strong></div></div><p class="dm-label">Mobile PageSpeed / 100</p>`;
      $(root, '.dm-phones').append(item); return { item, lcp, score };
    });
    function replay() {
      c.clear();
      phones.forEach(({ item }) => item.classList.remove('dm-painted'));
      c.add(t => {
        phones.forEach(({ item, lcp, score }) => {
          const p = Math.min(1, t / lcp);
          $(item, '.dm-timer').textContent = (Math.min(t, lcp) / 1000).toFixed(1) + ' s';
          $(item, '.dm-gauge strong').textContent = Math.round(score * p);
          $(item, '.dm-gauge-fill').style.strokeDasharray = `${score * p} 100`;
          item.classList.toggle('dm-painted', t >= lcp);
        });
        if (t >= 4000) return false;
      });
    }
    $(root, '.dm-head').append(button('Replay ↻', replay)); replay();
  }
  function productLens(root) {
    shell(root, false, 'Example product. This is the structured data we add so assistants can compare and recommend it.', `
      <div class="dm-toggle dm-lens-toggle" aria-label="Product view"></div><div class="dm-lens-grid">
      <article class="dm-product"><div class="dm-product-art"><span class="dm-label">Built for a lighter footprint</span><svg viewBox="0 0 400 260" role="img" aria-label="Two-tone sage and cream fish surfboard"><ellipse cx="205" cy="232" rx="100" ry="9" fill="#0e1c2710"/><g transform="rotate(28 200 130)"><path d="M200 15 C135 55 156 184 172 238 L200 219 L228 238 C244 184 265 55 200 15Z" fill="#f6f7f3" stroke="#476355" stroke-width="2"/><path d="M200 16 C265 55 244 184 228 238 L200 219Z" fill="#799687"/><path d="M200 20 V215" stroke="#476355"/><path d="M176 175 L185 205 M216 175 L207 205" stroke="#476355" stroke-width="3"/></g></svg></div><div class="dm-product-details"><span class="dm-label dm-field" tabindex="0" data-field="brand">Your Surf Store</span><h3 class="dm-field" tabindex="0" data-field="name">Eco Fish Surfboard 6'2</h3><div class="dm-head"><strong class="dm-price dm-field" tabindex="0" data-field="price">A$899</strong><span class="dm-stock dm-field" tabindex="0" data-field="stock">● In stock</span></div><p class="dm-field" tabindex="0" data-field="rating">★ 4.8 (32 reviews)</p></div></article>
      <div class="dm-code-panel"><p class="dm-label">Product / JSON-LD</p><pre class="dm-code" aria-label="Example Product structured data"></pre></div></div><ul class="dm-checklist"></ul>`);
    const schema = {
      '@context': 'https://schema.org', '@type': 'Product', name: "Eco Fish Surfboard 6'2",
      image: 'https://yoursurfstore.example/eco-fish.jpg',
      brand: { '@type': 'Brand', name: 'Your Surf Store' }, sku: 'ECO-FISH-62', gtin13: '9351234567892',
      offers: { '@type': 'Offer', price: '899.00', priceCurrency: 'AUD', availability: 'https://schema.org/InStock',
        shippingDetails: { '@type': 'OfferShippingDetails', shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'AU' } } },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: 4.8, reviewCount: 32 }
    };
    let group = '';
    JSON.stringify(schema, null, 2).split('\n').forEach(line => {
      if (line.includes('"brand"')) group = 'brand';
      if (line.includes('"aggregateRating"')) group = 'rating';
      let field = group;
      if (!group && line.includes('"name"')) field = 'name';
      if (line.includes('"price"') || line.includes('"priceCurrency"')) field = 'price';
      if (line.includes('"availability"')) field = 'stock';
      const row = el('span', 'dm-code-line');
      if (field) { row.dataset.field = field; row.tabIndex = 0; }
      line.split(/("(?:[^"\\]|\\.)*"|\b\d+(?:\.\d+)?\b)/g).forEach((part, i) => {
        row.append(el('span', i % 2 ? (part.startsWith('"') ? 'dm-code-string' : 'dm-code-number') : '', part));
      });
      $(root, '.dm-code').append(row, document.createTextNode('\n'));
      if (group && line.trim().startsWith('}')) group = '';
    });
    function highlight(field) {
      all(root, '[data-field]').forEach(n => n.classList.toggle('dm-highlight', !!field && n.dataset.field === field));
    }
    all(root, '[data-field]').forEach(n => {
      n.addEventListener('mouseenter', () => highlight(n.dataset.field));
      n.addEventListener('mouseleave', () => highlight(document.activeElement.dataset.field));
      n.addEventListener('focus', () => highlight(n.dataset.field));
      n.addEventListener('blur', () => highlight(''));
    });
    toggle($(root, '.dm-toggle'), ['What shoppers see', 'What AI assistants read'], i => root.classList.toggle('dm-show-code', !!i));
    ['Name', 'Price', 'Currency', 'Availability', 'GTIN', 'Reviews', 'Shipping'].forEach(label => {
      const li = el('li'); li.append(el('span', 'dm-check', '✓'), document.createTextNode(label)); $(root, '.dm-checklist').append(li);
    });
  }
  function platformChooser(root) {
    shell(root, false, 'A starting point, not a verdict. We confirm the right platform in discovery.', '<div class="dm-chooser"><div class="dm-questions"></div><div class="dm-recommendation" aria-live="polite" aria-atomic="true"><span class="dm-label">Your starting point</span><h3>Answer three quick questions.</h3><p class="dm-why"></p><p class="dm-watch"></p></div></div>');
    const questions = [
      ['How many products?', ['Under 200', '200-5,000', '5,000+'], [[2, 2, 0], [2, 1, 1], [1, 0, 2]]],
      ['How custom does it need to be?', ['Standard is fine', 'Some custom features', 'Fully custom'], [[2, 1, 0], [1, 2, 1], [0, 0, 3]]],
      ['Who runs it day to day?', ['Just me', 'A small team', 'We have developers'], [[2, 1, 0], [1, 2, 0], [0, 1, 2]]]
    ];
    const results = [
      ['Shopify', 'Why: the fastest route to a reliable store, with payments, apps and AI-assistant channels built in.', 'Watch out: monthly app costs add up, and deep custom logic is harder.'],
      ['WooCommerce', 'Why: full control on WordPress, a huge plugin range and no platform transaction fees.', 'Watch out: it needs hosting, updates and security care - we handle that in a care plan.'],
      ['Headless (Medusa)', 'Why: total freedom for custom pricing, B2B rules and integrations, with a fast custom front end.', 'Watch out: more engineering up front; best when the store is core to the business.']
    ];
    const answers = [null, null, null], id = ++serial;
    questions.forEach(([question, choices], q) => {
      const fieldset = el('fieldset', 'dm-question');
      fieldset.append(el('legend', '', question));
      const options = el('div', 'dm-options');
      choices.forEach((choice, i) => {
        const label = el('label', 'dm-radio'), input = el('input');
        input.type = 'radio'; input.name = `dm-platform-${id}-${q}`; input.value = i;
        input.addEventListener('change', () => { answers[q] = i; update(); });
        label.append(input, el('span', '', choice)); options.append(label);
      });
      fieldset.append(options); $(root, '.dm-questions').append(fieldset);
    });
    function update() {
      const count = answers.filter(a => a !== null).length;
      if (count < 3) { $(root, '.dm-recommendation h3').textContent = `${count} of 3 answered. Keep going.`; return; }
      const totals = [0, 0, 0];
      answers.forEach((a, q) => questions[q][2][a].forEach((n, i) => { totals[i] += n; }));
      const winner = totals.indexOf(Math.max(...totals));
      ['h3', '.dm-why', '.dm-watch'].forEach((sel, i) => { $(root, '.dm-recommendation ' + sel).textContent = results[winner][i]; });
    }
  }
  function savingsCalc(root, c) {
    shell(root, false, 'Estimate only. Real savings depend on your processes; we measure them in discovery.', '<div class="dm-calculator"><div class="dm-sliders"></div><div class="dm-savings"><span class="dm-label">Time back for your business</span><div class="dm-totals" aria-live="polite" aria-atomic="true"><div><strong class="dm-hours">0</strong><p>Hours saved per month</p></div><div><strong class="dm-value">A$0</strong><p>Value per year</p></div></div><div class="dm-bars"><div class="dm-bar-label"><span>Manual now</span><span class="dm-manual"></span></div><div class="dm-bar"><i></i></div><div class="dm-bar-label"><span>After automation</span><span class="dm-after"></span></div><div class="dm-bar dm-bar-after"><i></i></div></div></div></div>');
    const specs = [['Orders or enquiries per week', 10, 1000, 120, 10, ''], ['Minutes of manual admin each', 1, 30, 6, 1, ''], ['Hourly cost of that time (A$)', 25, 120, 45, 5, ''], ['Share we can automate', 40, 95, 80, 5, '%']];
    const inputs = [], id = ++serial;
    let shown = [0, 0];
    specs.forEach(([label, min, max, value, step, suffix], i) => {
      const wrap = el('div', 'dm-slider'), head = el('div', 'dm-slider-label');
      const lab = el('label', '', label), output = el('output', '', value + suffix), input = el('input');
      input.type = 'range'; input.min = min; input.max = max; input.value = value; input.step = step; input.id = `dm-range-${id}-${i}`;
      lab.htmlFor = input.id; output.htmlFor = input.id;
      input.addEventListener('input', () => { output.textContent = input.value + suffix; update(); });
      head.append(lab, output); wrap.append(head, input); $(root, '.dm-sliders').append(wrap); inputs.push(input);
    });
    // first render shows the real figures straight away; only slider changes count up
    function update(animate = true) {
      const [orders, minutes, cost, share] = inputs.map(n => Number(n.value));
      const hours = orders * minutes / 60 * 52 / 12, saved = hours * share / 100;
      const target = [saved, saved * 12 * cost], from = [...shown];
      $(root, '.dm-manual').textContent = Math.round(hours) + ' h / month';
      $(root, '.dm-after').textContent = Math.round(hours - saved) + ' h / month';
      $(root, '.dm-bar-after i').style.width = (100 - share) + '%';
      if (!animate) {
        shown = target;
        $(root, '.dm-hours').textContent = Math.round(saved).toLocaleString('en-AU');
        $(root, '.dm-value').textContent = money(target[1]);
        return;
      }
      c.clear(); $(root, '.dm-totals').setAttribute('aria-busy', 'true');
      c.add(t => {
        const p = 1 - Math.pow(1 - Math.min(1, t / 550), 3);
        shown = target.map((n, i) => from[i] + (n - from[i]) * p);
        $(root, '.dm-hours').textContent = Math.round(shown[0]).toLocaleString('en-AU');
        $(root, '.dm-value').textContent = money(shown[1]);
        if (p === 1) { $(root, '.dm-totals').setAttribute('aria-busy', 'false'); return false; }
      });
    }
    update(false);
  }
  function chatDemo(root, c) {
    shell(root, true, 'Simulated demo. A real assistant answers from your own content and hands over when it should.', '<div class="dm-head"><div><h3>Harbour Plumbing Co.</h3><span class="dm-online">● Online</span> <span class="dm-chip">AI assistant</span></div></div><div class="dm-conversation" aria-live="polite" aria-relevant="additions text"></div><div class="dm-suggestions" aria-label="Suggested questions"></div>');
    const data = [
      ['Do you do weekend callouts?', 'Yes. We run emergency callouts 7 days, including weekends and public holidays, across the Inner West and Eastern Suburbs. A weekend call-out fee applies.', ['Services page', 'Pricing guide (PDF)']],
      ['Which suburbs do you cover?', "We cover Sydney's Inner West, Eastern Suburbs and the Lower North Shore. For other areas we can recommend a trusted partner.", ['Service areas page']],
      ['Can you give me an exact quote?', "I can't give an exact price without seeing the job, so I've passed your request to the team. Expect a call within one business hour.", ['Handed to a human']]
    ];
    const conversation = $(root, '.dm-conversation');
    const buttons = data.map(([question, answer, sources]) => {
      const b = button(question, () => {
        buttons.forEach(n => { n.disabled = true; }); b.setAttribute('aria-pressed', 'true');
        conversation.append(el('p', 'dm-bubble dm-user', question));
        const bubble = el('div', 'dm-bubble'), text = el('p', '', 'Typing…'), source = el('div', 'dm-chips');
        bubble.append(text, source); bubble.setAttribute('aria-busy', 'true'); conversation.append(bubble);
        c.add(t => {
          if (t < 900) return;
          if (typeText(text, answer, t, 900)) {
            chips(source, sources); bubble.setAttribute('aria-busy', 'false');
            buttons.forEach(n => { n.disabled = false; }); return false;
          }
        });
      }, 'dm-question-chip');
      b.setAttribute('aria-pressed', 'false'); $(root, '.dm-suggestions').append(b); return b;
    });
    function reset() {
      c.clear(); conversation.replaceChildren(el('p', 'dm-bubble', 'Hi! I can answer questions about our services, areas and pricing.'));
      buttons.forEach(b => { b.disabled = false; b.setAttribute('aria-pressed', 'false'); });
    }
    $(root, '.dm-head').append(button('Reset', reset, 'dm-text-button')); reset();
  }
  function docExtract(root, c) {
    shell(root, false, 'Illustrative: AI document processing with a human review step before anything is approved.', `<div class="dm-head"><span class="dm-label">Document → structured data</span></div><div class="dm-document-grid"><div class="dm-invoice"><div class="dm-scan" aria-hidden="true"></div><p class="dm-label">Supplier document / example</p><h3 data-value="0">Coastal Timber Supplies</h3><p data-value="2">Tax invoice INV-20418</p><p data-value="3">Date 14 Oct 2026</p><p data-value="1">ABN 12 345 678 901</p><div class="dm-invoice-items"><div><span>Hardwood decking · 50 m</span><span>A$2,500.00</span></div><div><span>Treated pine · 25 m</span><span>A$1,250.00</span></div><div><span>Fixings · 5 boxes</span><span>A$625.00</span></div></div><p class="dm-invoice-gst" data-value="5">GST A$437.50</p><p class="dm-invoice-total" data-value="6">Total A$4,812.50 inc GST</p><p data-value="4">Due 28 Oct 2026</p></div><div class="dm-extraction"><h3>Extracted data</h3><div class="dm-extracted-fields" aria-live="polite" aria-atomic="true"></div><p class="dm-draft" aria-live="polite"></p><p class="dm-review">Human review required before approval</p></div></div>`);
    const data = [['Supplier', 'Coastal Timber Supplies'], ['ABN', '12 345 678 901'], ['Invoice no.', 'INV-20418'], ['Date', '14 Oct 2026'], ['Due date', '28 Oct 2026'], ['GST', 'A$437.50'], ['Total', 'A$4,812.50']];
    const id = ++serial;
    const fields = data.map(([label, value], i) => {
      const wrap = el('div', 'dm-extracted-field'), lab = el('label', '', label), output = el('input');
      output.id = `dm-extract-${id}-${i}`; output.readOnly = true; output.placeholder = 'Awaiting scan'; lab.htmlFor = output.id;
      wrap.append(lab, output); $(root, '.dm-extracted-fields').append(wrap); return { output, value, source: $(root, `[data-value="${i}"]`) };
    });
    function replay() {
      c.clear(); fields.forEach(({ output, source }) => { output.value = ''; source.classList.remove('dm-highlight'); });
      $(root, '.dm-draft').textContent = ''; $(root, '.dm-extracted-fields').setAttribute('aria-busy', 'true');
      c.add((t, reduced) => {
        const invoice = $(root, '.dm-invoice'), progress = Math.min(1, t / 5000);
        $(root, '.dm-scan').style.top = progress * 100 + '%';
        $(root, '.dm-scan').hidden = progress === 1;
        fields.forEach(({ output, value, source }) => {
          const start = (source.offsetTop + source.offsetHeight / 2) / invoice.offsetHeight * 5000;
          if (t >= start) {
            source.classList.add('dm-highlight'); output.value = value.slice(0, Math.max(0, Math.floor((t - start) / 18)));
          }
        });
        if (t >= 5500) {
          $(root, '.dm-extracted-fields').setAttribute('aria-busy', 'false');
          $(root, '.dm-draft').textContent = '✓ Draft bill created in your accounting software';
        }
        if (reduced) return false;
        if (t >= 9500) { replay(); return false; }
      });
    }
    $(root, '.dm-head').append(button('Replay ↻', replay)); replay();
  }
  function monitor(root, c) {
    shell(root, true, 'Illustrative dashboard. Care plans include monitoring like this, with alerts when something changes.', '<div class="dm-head"><span class="dm-label">Care / system health</span><span class="dm-last dm-label" aria-live="polite">Last check: 0s ago</span></div><div class="dm-uptime"><p>Uptime, last 30 days</p><strong>99.98<span>%</span></strong><div class="dm-uptime-bars"></div><div class="dm-head dm-label"><span>30 days ago</span><span>Today</span></div></div><div class="dm-lcp"><div class="dm-head"><p>Largest Contentful Paint</p><strong class="dm-current" aria-live="polite">1.9 s</strong></div><svg viewBox="0 0 460 100" role="img" aria-label="Illustrative LCP history between 1.7 and 2.2 seconds"><path d="M0 25H460 M0 75H460" stroke="#2a3d4b" stroke-dasharray="3 6"/><polyline fill="none" stroke="#8ef5c8" stroke-width="2.5" stroke-linejoin="round"/></svg><span class="dm-label">Target &lt; 2.5 s · healthy</span></div><ul class="dm-checks"></ul>');
    for (let i = 0; i < 30; i++) {
      const bar = el('span', i === 11 ? 'dm-uptime-warning' : '');
      bar.title = `Day ${i + 1}: ${i === 11 ? '99.4% uptime · brief interruption' : '100% uptime'}`;
      bar.tabIndex = 0; bar.setAttribute('aria-label', bar.title); $(root, '.dm-uptime-bars').append(bar);
    }
    ['SSL certificate · valid for 63 days', 'Security headers · A', 'Backups · last run 02:00', 'Broken links · 0', 'AI agent readiness · 100/100'].forEach(text => $(root, '.dm-checks').append(el('li', '', text)));
    let values = [1.9, 1.8, 2, 2.1, 1.9, 1.7, 1.8, 2, 2.2, 2, 1.8, 1.9, 2, 1.8, 1.9], step = 0, seconds = -1;
    function draw() { $(root, 'polyline').setAttribute('points', values.map((v, i) => `${i * 460 / (values.length - 1)},${85 - (v - 1.7) * 130}`).join(' ')); }
    draw();
    c.add((t, reduced) => {
      if (reduced) return false;
      const s = Math.floor(t / 1000) % 30;
      if (s !== seconds) { seconds = s; $(root, '.dm-last').textContent = `Last check: ${s}s ago`; }
      if (Math.floor(t / 1500) > step) {
        step = Math.floor(t / 1500);
        const value = Math.round((1.7 + Math.random() * .5) * 10) / 10;
        values = [...values.slice(1), value]; draw(); $(root, '.dm-current').textContent = value.toFixed(1) + ' s';
      }
    });
  }
  const widgets = { 'ai-answer': aiAnswer, 'speed-race': speedRace, 'product-lens': productLens, 'platform-chooser': platformChooser, 'savings-calc': savingsCalc, 'chat-demo': chatDemo, 'doc-extract': docExtract, monitor };
  function init() {
    document.querySelectorAll('[data-demo]').forEach(root => {
      const build = widgets[root.dataset.demo];
      if (build && !root.hasAttribute('data-dm-mounted')) { root.setAttribute('data-dm-mounted', ''); build(root, clock(root)); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
