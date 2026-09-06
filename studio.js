(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  function closeMenu(focus = false) {
    nav?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (focus) menuButton?.focus();
  }
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav?.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true); });
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  mobile.addEventListener('change', () => closeMenu());

  // One film, loaded on demand. The poster is always a usable baseline.
  const film = document.querySelector('.hero-film');
  const video = film?.querySelector('video');
  const filmButton = film?.querySelector('.film-toggle');
  let manuallyPaused = false, filmVisible = false, manualPlay = false;
  function updateFilm() {
    const playing = !video.paused;
    filmButton.setAttribute('aria-label', playing ? 'Pause background film' : 'Play background film');
    filmButton.setAttribute('aria-pressed', String(playing));
    filmButton.querySelector('span').textContent = playing ? 'Ⅱ' : '▶';
    film.classList.toggle('is-playing', playing && video.readyState >= 2);
  }
  async function playFilm() {
    if (!video || motion.matches || document.hidden || document.querySelector('.preview-dialog')?.open) return;
    if (navigator.connection?.saveData && !manualPlay) return;
    if (!video.getAttribute('src')) {
      video.src = mobile.matches ? video.dataset.mobileSrc : video.dataset.src;
      video.load();
    }
    try { await video.play(); } catch { /* Autoplay may be disabled; the still remains. */ }
    updateFilm();
  }
  if (video && filmButton) {
    filmButton.hidden = motion.matches;
    video.addEventListener('playing', updateFilm);
    video.addEventListener('pause', updateFilm);
    video.addEventListener('error', () => { film.classList.remove('is-playing'); filmButton.hidden = true; });
    filmButton.addEventListener('click', () => {
      if (video.paused) { manuallyPaused = false; manualPlay = true; playFilm(); }
      else { manuallyPaused = true; video.pause(); }
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      filmVisible = entries[0].isIntersecting;
      if (filmVisible && !manuallyPaused) playFilm(); else video.pause();
    }, { threshold: .12 }).observe(film);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) video.pause(); else if (filmVisible && !manuallyPaused) playFilm();
    });
    motion.addEventListener('change', () => {
      filmButton.hidden = motion.matches;
      if (motion.matches) video.pause(); else if (filmVisible && !manuallyPaused) playFilm();
    });
  }

  // Native modal focus containment; plain links remain available without JavaScript.
  const dialog = document.querySelector('.preview-dialog');
  const frame = dialog?.querySelector('iframe');
  const content = dialog?.querySelector('.preview-content');
  let opener = null, slowTimer = 0, hoverTimer = 0, hoverTarget = null;
  function clearHover() {
    clearTimeout(hoverTimer);
    hoverTarget?.querySelector('.hover-preview')?.remove();
    hoverTarget = null;
  }
  function projectURL(anchor) {
    try {
      const url = new URL(anchor.href, location.href);
      if (url.origin === location.origin && url.pathname.startsWith('/demos/')) return url.href;
      if (url.origin === 'https://conen.dev' && url.pathname.startsWith('/work/')) return url.href;
    } catch { /* Unrecognised URLs keep the ordinary link behaviour. */ }
    return null;
  }
  function closePreview() {
    clearTimeout(slowTimer);
    frame.src = 'about:blank';
    dialog.close();
    document.documentElement.style.overflow = '';
    opener?.focus({ preventScroll: true });
    if (filmVisible && !manuallyPaused) playFilm();
  }
  if (dialog && typeof dialog.showModal === 'function') {
    document.addEventListener('click', e => {
      const anchor = e.target.closest('a[data-preview]');
      if (!anchor || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const url = projectURL(anchor);
      if (!url) return;
      e.preventDefault();
      clearHover();
      opener = anchor;
      dialog.querySelector('#preview-title').textContent = anchor.dataset.title;
      dialog.querySelectorAll('.preview-open,.preview-fallback').forEach(a => { a.href = url; });
      frame.title = `${anchor.dataset.title} — interactive concept preview`;
      dialog.querySelector('.preview-status p').textContent = 'Loading the live demo. You can also open it in a new tab.';
      content.classList.add('is-waiting');
      content.classList.remove('is-slow');
      frame.src = url;
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
      video?.pause();
      dialog.querySelector('.preview-close').focus();
      clearTimeout(slowTimer);
      slowTimer = setTimeout(() => {
        if (!dialog.open) return;
        content.classList.remove('is-waiting');
        content.classList.add('is-slow');
        dialog.querySelector('.preview-status p').textContent = 'Taking a little longer? This demo may load more easily in its own tab.';
      }, 12000);
    });
    frame.addEventListener('load', () => {
      if (!dialog.open || frame.getAttribute('src') === 'about:blank') return;
      clearTimeout(slowTimer);
      content.classList.remove('is-waiting', 'is-slow');
    });
    dialog.querySelector('.preview-close').addEventListener('click', closePreview);
    dialog.addEventListener('cancel', e => { e.preventDefault(); closePreview(); });
    dialog.addEventListener('click', e => { if (e.target === dialog) closePreview(); });
  }

  const archive = document.querySelector('.archive-grid');
  const cards = [...document.querySelectorAll('.archive-card')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const previous = document.querySelector('#deck-previous');
  const next = document.querySelector('#deck-next');
  let slide = 0;
  const visibleCards = () => cards.filter(card => !card.hidden);
  function paintSlide() {
    const visible = visibleCards();
    slide = visible.length ? (slide + visible.length) % visible.length : 0;
    cards.forEach(card => card.classList.remove('is-slide'));
    visible[slide]?.classList.add('is-slide');
    const position = document.querySelector('#deck-position');
    if (position) position.textContent = `${visible.length ? slide + 1 : 0} / ${visible.length}`;
    if (previous) previous.disabled = visible.length < 2;
    if (next) next.disabled = visible.length < 2;
  }
  function filterProjects(filter) {
    clearHover();
    cards.forEach(card => { card.hidden = filter !== 'all' && card.dataset.category !== filter; });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    slide = 0;
    paintSlide();
    document.querySelector('.archive-count').textContent = `${visibleCards().length} of ${cards.length} live demos`;
  }
  filters.forEach(button => button.addEventListener('click', () => filterProjects(button.dataset.filter)));
  function moveSlide(direction) {
    if (!mobile.matches) return;
    clearHover();
    slide += direction;
    paintSlide();
  }
  previous?.addEventListener('click', () => moveSlide(-1));
  next?.addEventListener('click', () => moveSlide(1));
  mobile.addEventListener('change', () => { clearHover(); paintSlide(); });
  if (cards.length) filterProjects('all');
  if (archive) {
    let touchStart = null, swallowClick = false;
    archive.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
      swallowClick = false;
    }, { passive: true });
    archive.addEventListener('touchend', e => {
      if (!mobile.matches || !touchStart) return;
      const t = e.changedTouches[0], dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) { swallowClick = true; moveSlide(dx < 0 ? 1 : -1); }
      touchStart = null;
    }, { passive: true });
    archive.addEventListener('click', e => {
      if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopPropagation(); }
    }, true);
    document.querySelector('.archive-deck').addEventListener('keydown', e => {
      if (dialog?.open || !mobile.matches || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      moveSlide(e.key === 'ArrowLeft' ? -1 : 1);
      // A card that is becoming hidden must never retain keyboard focus.
      if (e.target.closest('.archive-card')) visibleCards()[slide]?.querySelector('a').focus({ preventScroll: true });
    });
    const hoverCapable = matchMedia('(hover: hover) and (pointer: fine)');
    archive.addEventListener('pointerover', e => {
      const anchor = e.target.closest('a[data-preview]');
      if (!anchor || anchor.contains(e.relatedTarget) || mobile.matches || !hoverCapable.matches || motion.matches || navigator.connection?.saveData) return;
      clearHover();
      hoverTimer = setTimeout(() => {
        const url = projectURL(anchor);
        if (!url || dialog?.open) return;
        hoverTarget = anchor;
        const shell = anchor.querySelector('.project-image');
        const preview = document.createElement('iframe');
        preview.className = 'hover-preview';
        preview.title = `${anchor.dataset.title} hover preview`;
        preview.tabIndex = -1;
        preview.setAttribute('aria-hidden', 'true');
        preview.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        preview.setAttribute('referrerpolicy', 'no-referrer');
        preview.style.setProperty('--preview-scale', String(shell.clientWidth / 1440));
        preview.src = url;
        preview.addEventListener('load', () => preview.classList.add('loaded'), { once: true });
        shell.appendChild(preview);
      }, 650);
    });
    archive.addEventListener('pointerout', e => {
      const anchor = e.target.closest('a[data-preview]');
      if (anchor && !anchor.contains(e.relatedTarget)) clearHover();
    });
    window.addEventListener('blur', clearHover);
    window.addEventListener('resize', clearHover, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearHover(); });
  }
  if ('IntersectionObserver' in window && !motion.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
  // Enable enhanced mobile layouts only after every handler is ready.
  document.documentElement.classList.add('js');
})();
