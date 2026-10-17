// Project brief form: posts to the AWA Worker; prefilled from ?service=&website=&note=&founding=1 links on other pages.
(() => {
  const API = /^(www\.)?australianweb\.agency$/.test(location.hostname)
    ? 'https://api.australianweb.agency/brief'
    : 'http://127.0.0.1:8787/brief';
  const form = document.getElementById('brief-form'), status = document.getElementById('brief-status');
  const button = form.querySelector('button[type=submit]');
  const q = new URLSearchParams(location.search);
  for (const s of q.getAll('service')) { const box = form.querySelector(`input[name=services][value="${CSS.escape(s)}"]`); if (box) box.checked = true; }
  if (q.get('website')) form.website.value = q.get('website').slice(0, 300);
  if (q.get('note')) form.note.value = q.get('note').slice(0, 1500);
  if (q.get('goal')) form.goal.value = q.get('goal').slice(0, 4000);
  if (q.get('founding') === '1') form.founding.checked = true;

  const say = (text, error) => { status.textContent = text; status.classList.toggle('is-error', !!error); };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.name.value.trim() || !form.email.checkValidity() || !form.email.value || form.goal.value.trim().length < 10) {
      say('Please add your name, a valid email and a few words about what the project should achieve.', true);
      (!form.name.value.trim() ? form.name : !form.email.value || !form.email.checkValidity() ? form.email : form.goal).focus();
      return;
    }
    const data = {
      services: [...form.querySelectorAll('input[name=services]:checked')].map(b => b.value),
      name: form.name.value, email: form.email.value, business: form.business.value, website: form.website.value,
      goal: form.goal.value, timing: form.timing.value, budget: form.budget.value, founding: form.founding.checked,
      note: form.note.value, company_fax: form.company_fax.value,
    };
    button.disabled = true;
    say('Sending…');
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const r = await res.json().catch(() => ({ ok: false }));
      if (!r.ok) throw new Error(r.message || 'failed');
      if (window.awaStat) window.awaStat('brief', data.services.join('+') || 'none');
      form.replaceChildren();
      const done = document.createElement('div');
      done.className = 'brief-done';
      const h = document.createElement('h2'); h.textContent = `Thanks, ${data.name.split(' ')[0]}.`;
      const p = document.createElement('p'); p.textContent = `Your brief is in. You’ll get a written plan and a fixed quote at ${data.email} within two business days.`;
      done.append(h, p);
      form.append(done);
      done.setAttribute('tabindex', '-1');
      done.focus();
    } catch (err) {
      button.disabled = false;
      say(err.message && err.message !== 'failed' ? err.message : 'Sorry, the brief could not be sent. Please try again in a minute.', true);
    }
  });
})();
