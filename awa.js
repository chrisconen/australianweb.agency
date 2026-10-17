// AWA homepage: mobile menu and footer year. The hero test form is a plain GET to /agent-test.html?url=.
(() => {
  const toggle = document.querySelector('.menu-toggle'), nav = document.getElementById('site-nav');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav.addEventListener('click', e => {
    if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
  });
  document.querySelectorAll('[data-year]').forEach(n => { n.textContent = new Date().getFullYear(); });
})();
