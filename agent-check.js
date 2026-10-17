// AI Agent Readiness Test page: posts the URL to the AWA Worker and renders the report.
// Report strings come from third-party pages (titles, product names), so everything is set with textContent.
(() => {
  const API = /^(www\.)?australianweb\.agency$/.test(location.hostname)
    ? 'https://api.australianweb.agency/agent-test'
    : 'http://127.0.0.1:8787/agent-test';
  const GROUPS = [
    ['find', '01 / Find', 'Can AI assistants find you?'],
    ['understand', '02 / Understand', 'Can they understand what you offer?'],
    ['act', '03 / Act', 'Can they act for your customers?'],
  ];
  const ICON = { pass: '✓', warn: '!', fail: '✕', info: 'i' };
  const LABEL = { pass: 'Passed', warn: 'Needs attention', fail: 'Failed', info: 'For information' };
  const SUMMARY = {
    'Agent-ready': 'AI assistants can find, read and use this site well. Keep it that way as the standards evolve.',
    'Agent-aware': 'The basics are in place, but gaps keep assistants from recommending or using this site with confidence.',
    'Hard for agents': 'Assistants struggle to find or understand this site. Competitors with cleaner signals will be recommended first.',
    'Invisible to agents': 'AI assistants can barely see this site. Fixing the failed checks is the priority.',
  };
  const $ = id => document.getElementById(id);
  const form = $('at-form'), input = $('at-url'), status = $('at-status'), button = form.querySelector('button');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  function setStatus(text, error) {
    status.textContent = text;
    status.classList.toggle('is-error', !!error);
  }

  function render(r) {
    $('at-score').textContent = r.score;
    $('at-grade').textContent = r.grade;
    $('at-meta').textContent = `${SUMMARY[r.grade] || ''} Tested ${r.finalUrl}${r.platform ? ` · ${r.platform}` : ''}${r.cached ? ' · cached result' : ''}`;
    const wrap = $('at-groups');
    wrap.replaceChildren();
    for (const [id, kicker, title] of GROUPS) {
      const checks = r.checks.filter(c => c.group === id);
      if (!checks.length) continue;
      const sec = el('section', 'at-group');
      const h = el('h2');
      h.append(el('span', null, kicker), title);
      const list = el('ul', 'at-checks');
      // failures first, then warnings, passes, info
      const order = { fail: 0, warn: 1, pass: 2, info: 3 };
      for (const c of checks.sort((a, b) => order[a.status] - order[b.status])) {
        const li = el('li', `at-check is-${c.status}`);
        const icon = el('span', 'at-icon', ICON[c.status]);
        icon.setAttribute('aria-hidden', 'true');
        const h3 = el('h3', null, c.label);
        h3.setAttribute('aria-label', `${LABEL[c.status]}: ${c.label}`);
        li.append(icon, h3, el('p', null, c.detail));
        if (c.fix && (c.status === 'fail' || c.status === 'warn')) {
          const fix = el('p', 'at-fix');
          fix.append(el('b', null, 'What to do: '), c.fix);
          li.append(fix);
        }
        list.append(li);
      }
      sec.append(h, list);
      wrap.append(sec);
    }
    const open = r.checks.filter(c => c.status === 'fail' || c.status === 'warn').map(c => `- ${c.label}: ${c.detail}`).join('\n');
    $('at-mail').href = 'mailto:info@australianweb.agency?subject=' + encodeURIComponent(`Agent readiness fix plan: ${r.finalUrl} (${r.score}/100)`)
      + '&body=' + encodeURIComponent(`Hi Chris,\n\nPlease send me a fix plan for ${r.finalUrl}.\nScore: ${r.score}/100 (${r.grade})\n\nOpen items:\n${open}\n\nThanks,\n`);
    if (r.grade === 'Agent-ready') {
      const em = el('em', null, 'ahead.');
      $('at-cta-title').replaceChildren('Stay ', em);
      $('at-cta-text').textContent = 'Agentic checkout and WebMCP are moving fast. I can keep your site ahead as the standards land in Australia.';
    } else {
      $('at-cta-title').replaceChildren('Want these ', el('em', null, 'fixed?'));
      $('at-cta-text').textContent = 'Send the report and I’ll reply with a plain-English fix plan for your site: what matters first, what it involves and what it costs.';
    }
    const results = $('at-results');
    results.hidden = false;
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = input.value.trim();
    if (!url) { setStatus('Enter your website address first.', true); input.focus(); return; }
    button.disabled = true;
    setStatus('Testing… reading your site the way AI assistants do.');
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const r = await res.json().catch(() => ({ ok: false }));
      if (!r.ok) { setStatus(r.message || 'The test could not run. Please try again in a minute.', true); return; }
      setStatus('');
      render(r);
      if (window.awaStat) window.awaStat('test_run', r.grade);
    } catch {
      setStatus('The test service is not reachable right now. Please try again shortly.', true);
    } finally {
      button.disabled = false;
    }
  });

  $('at-again').addEventListener('click', () => {
    $('at-results').hidden = true;
    input.value = '';
    window.scrollTo({ top: 0 });
    input.focus();
  });

  const preset = new URLSearchParams(location.search).get('url');
  if (preset) { input.value = preset; form.requestSubmit(); }
})();
