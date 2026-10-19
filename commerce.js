/* Local illustrations only: no cart, purchase, tracking or form submission. */
(() => {
  'use strict';
  const inputs = [...document.querySelectorAll('[data-cost-input]')];
  const first = document.querySelector('#cost-first');
  const next = document.querySelector('#cost-next');
  const money = new Intl.NumberFormat('en-AU', {style:'currency', currency:'AUD', maximumFractionDigits:2});
  function calculate() {
    if (!first || !next) return;
    const values = inputs.map(input => input.valueAsNumber);
    const valid = inputs.every(input => input.value !== '' && input.checkValidity()) && values.every(Number.isFinite);
    document.querySelector('#cost-error').hidden = valid;
    if (!valid) { first.textContent = 'Check the inputs'; next.textContent = '—'; return; }
    const annual = values[0] * 12 + values[1];
    first.textContent = money.format(999 + annual);
    next.textContent = money.format(annual);
  }
  inputs.forEach(input => input.addEventListener('input', calculate));
  calculate();
  const products = {
    bottle:{name:'The everyday bottle.',description:'A clear product name, useful details and an easy-to-find price. The same principles work across your own range.',price:'A$48.00'},
    sneaker:{name:'A better first step.',description:'Size, colour and availability belong beside the product. Your launch review checks that the chosen variant stays correct through the order.',price:'A$129.00'},
    skincare:{name:'Small product. Clear story.',description:'Bring the details that matter into focus: what the customer receives, how much it costs and how delivery works.',price:'A$36.00'}
  };
  document.querySelectorAll('[data-demo-product]').forEach(button => button.addEventListener('click', () => {
    const product = products[button.dataset.demoProduct];
    if (!product) return;
    document.querySelectorAll('[data-demo-product]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelector('#demo-product-title').textContent = product.name;
    document.querySelector('#demo-product-copy').textContent = product.description;
    document.querySelector('#demo-product-price').textContent = product.price;
  }));
})();
