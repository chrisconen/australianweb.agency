// Shared agency navigation. Existing form and API scripts own their contracts.
(() => {
  const toggle=document.querySelector('.menu-toggle'), nav=document.getElementById('site-nav');
  function close(focus=false){toggle?.setAttribute('aria-expanded','false');nav?.classList.remove('is-open');if(focus)toggle?.focus();}
  toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav?.classList.toggle('is-open',open);});
  nav?.addEventListener('click',e=>{if(e.target.closest('a'))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && toggle?.getAttribute('aria-expanded')==='true')close(true);});
  document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))close();});
  matchMedia('(max-width:980px)').addEventListener('change',()=>close());
  document.querySelectorAll('[data-year]').forEach(n=>n.textContent=new Date().getFullYear());
})();
