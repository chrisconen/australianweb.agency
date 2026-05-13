/**
 * LIVING.JS — Actor Module
 * DOM manipulation + MCP execution engine
 * 
 * Takes Brain decisions and makes them real.
 * Morphs the page. Calls MCP servers. Sends notifications.
 * 
 * @author Claude (CTO, Australian Web Agency)
 * @license MIT
 */

export class Actor {
  constructor(config = {}) {
    this.config = config;
    this.mcpConnections = new Map();
    this.modalsInjected = false;
    this.actionsExecuted = [];
    this._originalDOM = new Map();
  }

  /**
   * Execute a decision from the Brain
   */
  async execute(decision) {
    if (!decision || !decision.actions) return;

    for (const action of decision.actions) {
      try {
        await this._executeAction(action, decision);
        this.actionsExecuted.push({ ...action, ts: Date.now() });
      } catch (err) {
        console.warn(`[Living.js Actor] Action failed:`, action.type, err.message);
      }
    }

    // Show message if present
    if (decision.message) {
      this._showMessage(decision.message, decision.urgency);
    }
  }

  async _executeAction(action, decision) {
    switch (action.type) {
      case 'show-element':
        return this._showElement(action.target);
      case 'hide-element':
        return this._hideElement(action.target);
      case 'swap-cta':
        return this._swapCta(action.target, action.data);
      case 'show-modal':
        return this._showModal(action.target, action.data, decision);
      case 'highlight-section':
        return this._highlightSection(action.target);
      case 'reorder-sections':
        return this._reorderSections(action.data);
      case 'trigger-mcp':
        return this._triggerMcp(action.target, action.data, decision);
      default:
        console.warn(`[Living.js Actor] Unknown action: ${action.type}`);
    }
  }

  // ─── DOM MUTATIONS ────────────────────────────────────

  _showElement(selector) {
    const els = document.querySelectorAll(selector);
    els.forEach(el => {
      el.style.display = '';
      el.classList.add('living-visible');
      el.classList.remove('living-hidden');
      // Animate in
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }

  _hideElement(selector) {
    const els = document.querySelectorAll(selector);
    els.forEach(el => {
      el.style.transition = 'opacity 0.3s ease';
      el.style.opacity = '0';
      setTimeout(() => {
        el.classList.add('living-hidden');
        el.classList.remove('living-visible');
        el.style.display = 'none';
      }, 300);
    });
  }

  _swapCta(selector, data) {
    const els = document.querySelectorAll(selector);
    els.forEach(el => {
      // Save original
      if (!this._originalDOM.has(el)) {
        this._originalDOM.set(el, {
          text: el.textContent,
          className: el.className,
        });
      }

      // Swap text
      if (data.text) {
        el.textContent = data.text;
      }

      // Apply style
      if (data.style === 'urgent') {
        el.classList.add('living-cta-urgent');
      } else if (data.style === 'warm') {
        el.classList.add('living-cta-warm');
      }

      // Pulse animation
      el.classList.add('living-pulse');
      setTimeout(() => el.classList.remove('living-pulse'), 2000);
    });
  }

  _highlightSection(selector) {
    const el = document.querySelector(selector);
    if (!el) return;

    el.classList.add('living-highlight');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => el.classList.remove('living-highlight'), 3000);
  }

  _reorderSections(data) {
    if (!data.first) return;
    const target = document.querySelector(data.first);
    if (!target || !target.parentNode) return;

    // Save original position
    if (!this._originalDOM.has(target)) {
      this._originalDOM.set(target, { nextSibling: target.nextSibling, parent: target.parentNode });
    }

    // Move to top of parent
    target.parentNode.insertBefore(target, target.parentNode.firstChild);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ─── MODAL SYSTEM ─────────────────────────────────────

  _showModal(selector, data, decision) {
    // Check if modal already exists
    let modal = document.querySelector(selector);

    if (!modal) {
      // Create modal from template
      modal = this._createModal(data.template, decision);
      document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('living-modal-active');
    });
  }

  _createModal(template, decision) {
    const modal = document.createElement('div');
    modal.id = template === 'emergency-callback' ? 'living-emergency-modal' : 'living-exit-modal';
    modal.className = 'living-modal';

    const templates = {
      'emergency-callback': `
        <div class="living-modal-content living-emergency">
          <button class="living-modal-close" onclick="this.closest('.living-modal').style.display='none'">&times;</button>
          <div class="living-modal-icon">🚨</div>
          <h2>Need urgent help?</h2>
          <p>Leave your number and we'll call you back as soon as we're available.</p>
          <form class="living-form" data-living-form="emergency-callback">
            <input type="text" name="name" placeholder="Your name" required>
            <input type="tel" name="phone" placeholder="Your phone number" required>
            <textarea name="message" placeholder="Briefly describe your situation" rows="2"></textarea>
            <button type="submit">Request Callback →</button>
          </form>
          <p class="living-modal-note">We typically respond within 30 minutes during business hours.</p>
        </div>
      `,
      'exit-offer': `
        <div class="living-modal-content living-exit-offer">
          <button class="living-modal-close" onclick="this.closest('.living-modal').style.display='none'">&times;</button>
          <h2>${decision.message || "Before you go..."}</h2>
          <p>Get a free, no-obligation consultation. We'll review your situation and give you honest advice.</p>
          <form class="living-form" data-living-form="exit-capture">
            <input type="text" name="name" placeholder="Your name" required>
            <input type="email" name="email" placeholder="Your email" required>
            <input type="tel" name="phone" placeholder="Phone (optional)">
            <button type="submit">Get Free Consultation →</button>
          </form>
        </div>
      `,
    };

    modal.innerHTML = templates[template] || templates['exit-offer'];

    // Handle form submission
    const form = modal.querySelector('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        this._handleFormSubmit(form.dataset.livingForm, data, decision);
        form.innerHTML = '<div class="living-form-success">✓ Thank you! We\'ll be in touch soon.</div>';
      });
    }

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    return modal;
  }

  async _handleFormSubmit(formType, data, decision) {
    // Emit event for external handling
    const event = new CustomEvent('living:form-submit', {
      detail: { formType, data, decision },
    });
    document.dispatchEvent(event);

    // If webhook configured, send data
    if (this.config.webhookUrl) {
      try {
        await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: formType,
            data,
            decision: { intent: decision.intent, urgency: decision.urgency },
            timestamp: new Date().toISOString(),
            page: location.href,
          }),
        });
      } catch (err) {
        console.warn('[Living.js Actor] Webhook failed:', err.message);
      }
    }

    // Trigger MCP if configured
    if (this.config.mcp?.length) {
      this._triggerMcp('calendar', { type: 'lead-capture', ...data }, decision);
    }
  }

  // ─── MESSAGE DISPLAY ──────────────────────────────────

  _showMessage(text, urgency = 5) {
    // Don't show if already showing
    if (document.querySelector('.living-message')) return;

    const msg = document.createElement('div');
    msg.className = `living-message living-urgency-${urgency > 7 ? 'high' : urgency > 4 ? 'mid' : 'low'}`;
    msg.innerHTML = `
      <span class="living-message-text">${text}</span>
      <button class="living-message-close" onclick="this.parentNode.remove()">×</button>
    `;

    document.body.appendChild(msg);
    requestAnimationFrame(() => msg.classList.add('living-message-active'));

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      msg.classList.remove('living-message-active');
      setTimeout(() => msg.remove(), 400);
    }, 8000);
  }

  // ─── MCP BRIDGE ───────────────────────────────────────

  async _triggerMcp(serverName, data, decision) {
    const mcpConfig = (this.config.mcp || []).find(m => m.name === serverName);
    if (!mcpConfig) {
      console.warn(`[Living.js Actor] MCP server not configured: ${serverName}`);
      return;
    }

    // For now, emit event — full MCP implementation in mcp-bridge.js
    const event = new CustomEvent('living:mcp-trigger', {
      detail: { server: serverName, url: mcpConfig.url, data, decision },
    });
    document.dispatchEvent(event);
  }

  // ─── CSS INJECTION ────────────────────────────────────

  injectStyles() {
    if (document.querySelector('#living-styles')) return;

    const style = document.createElement('style');
    style.id = 'living-styles';
    style.textContent = `
      /* ─── Living.js Core Styles ─── */

      .living-hidden { display: none !important; }

      .living-pulse {
        animation: living-pulse 1.5s ease-in-out;
      }

      @keyframes living-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
        50% { box-shadow: 0 0 0 12px rgba(255, 215, 0, 0); }
      }

      .living-highlight {
        outline: 2px solid rgba(255, 215, 0, 0.6);
        outline-offset: 8px;
        transition: outline-color 0.3s ease;
      }

      .living-cta-urgent {
        background: #FFD700 !important;
        color: #000 !important;
        font-weight: 700 !important;
        animation: living-pulse 2s infinite;
      }

      .living-cta-warm {
        border-color: #FFD700 !important;
        color: #FFD700 !important;
      }

      /* ─── Modal ─── */

      .living-modal {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 100000;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(8px);
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .living-modal-active { opacity: 1; }

      .living-modal-content {
        background: #111;
        border: 1px solid rgba(255,215,0,0.2);
        border-radius: 16px;
        padding: 2.5rem;
        max-width: 440px;
        width: 90%;
        position: relative;
        color: #fff;
        font-family: inherit;
      }

      .living-modal-close {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        color: #888;
        font-size: 1.5rem;
        cursor: pointer;
        transition: color 0.2s;
      }

      .living-modal-close:hover { color: #FFD700; }

      .living-modal-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }

      .living-modal-content h2 {
        font-size: 1.4rem;
        margin-bottom: 0.5rem;
        color: #FFD700;
      }

      .living-modal-content p {
        color: #aaa;
        margin-bottom: 1.5rem;
        line-height: 1.6;
        font-size: 0.95rem;
      }

      .living-modal-note {
        font-size: 0.8rem !important;
        margin-top: 1rem !important;
        margin-bottom: 0 !important;
        opacity: 0.5;
      }

      /* ─── Forms ─── */

      .living-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .living-form input,
      .living-form textarea,
      .living-form select {
        background: #1a1a1a;
        border: 1px solid #333;
        color: #fff;
        padding: 0.85rem 1rem;
        border-radius: 8px;
        font-size: 0.95rem;
        font-family: inherit;
        transition: border-color 0.2s;
      }

      .living-form input:focus,
      .living-form textarea:focus {
        outline: none;
        border-color: #FFD700;
      }

      .living-form button[type="submit"] {
        background: #FFD700;
        color: #000;
        border: none;
        padding: 1rem;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .living-form button[type="submit"]:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 20px rgba(255,215,0,0.3);
      }

      .living-form-success {
        text-align: center;
        color: #FFD700;
        font-size: 1.2rem;
        padding: 2rem 0;
      }

      /* ─── Message Bar ─── */

      .living-message {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        z-index: 99999;
        background: #111;
        border: 1px solid rgba(255,215,0,0.3);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 480px;
        width: 90%;
        color: #fff;
        font-size: 0.9rem;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
      }

      .living-message-active {
        transform: translateX(-50%) translateY(0);
      }

      .living-urgency-high { border-color: #ff4444; }
      .living-urgency-high .living-message-text::before { content: '🚨 '; }
      .living-urgency-mid { border-color: #FFD700; }
      .living-urgency-low { border-color: rgba(255,255,255,0.1); }

      .living-message-close {
        background: none;
        border: none;
        color: #666;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0 4px;
        flex-shrink: 0;
      }

      /* ─── Emergency Theme ─── */

      .living-emergency h2 { color: #ff4444; }

      .living-emergency .living-form button[type="submit"] {
        background: #ff4444;
        color: #fff;
      }
    `;

    document.head.appendChild(style);
  }

  // ─── RESTORE ──────────────────────────────────────────

  restore() {
    this._originalDOM.forEach((original, el) => {
      if (original.text) el.textContent = original.text;
      if (original.className) el.className = original.className;
      if (original.nextSibling && original.parent) {
        original.parent.insertBefore(el, original.nextSibling);
      }
    });
    this._originalDOM.clear();
  }
}
