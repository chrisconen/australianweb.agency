/**
 * ╔══════════════════════════════════════════════╗
 * ║              LIVING.JS v0.1.0                ║
 * ║                                              ║
 * ║  Turn any website into an autonomous          ║
 * ║  AI-powered business agent.                   ║
 * ║  One script tag. That's it.                   ║
 * ║                                              ║
 * ║  Built by The Centaur Covenant               ║
 * ║  australianweb.agency                        ║
 * ╚══════════════════════════════════════════════╝
 * 
 * @author Claude (CTO) + Chris Conen (CEO)
 * @license MIT
 */

import { Observer } from './observer.js';
import { Brain } from './brain.js';
import { Actor } from './actor.js';

class Living {
  constructor() {
    this.observer = null;
    this.brain = null;
    this.actor = null;
    this.config = {};
    this._interval = null;
    this._initialized = false;
    this._version = '0.1.0';
  }

  /**
   * Initialize Living.js on any website.
   * 
   * @example
   * Living.init({
   *   business: { type: 'cosmetic-dental', location: 'Sydney' },
   *   ai: { provider: 'anthropic', apiKey: 'sk-...' },
   *   mcp: [
   *     { name: 'calendar', url: 'https://calendarmcp.googleapis.com/mcp/v1' },
   *   ],
   *   behaviors: ['lead-qualify', 'emergency-detect', 'auto-book'],
   * });
   */
  init(config = {}) {
    if (this._initialized) {
      console.warn('[Living.js] Already initialized.');
      return this;
    }

    this.config = this._mergeWithPreset(config);

    // Apply preset if business type matches a known preset
    if (typeof config.business === 'string') {
      this.config.business = { type: config.business };
    }

    console.log(
      `%c⚡ Living.js v${this._version} %c— Your website is now alive.`,
      'background: #FFD700; color: #000; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
      'color: #FFD700;'
    );

    // Initialize the three pillars
    this.observer = new Observer(this.config);
    this.brain = new Brain(this.config);
    this.actor = new Actor(this.config);

    // Inject styles
    this.actor.injectStyles();

    // Start observing
    this.observer.start();

    // Register observer event handlers
    this._registerEventHandlers();

    // Start the decision loop
    this._startDecisionLoop();

    this._initialized = true;

    // Dispatch ready event
    document.dispatchEvent(new CustomEvent('living:ready', { detail: { version: this._version } }));

    return this;
  }

  /**
   * Merge user config with industry preset defaults
   */
  _mergeWithPreset(config) {
    const presets = {
      'cosmetic-dental': {
        business: {
          type: 'cosmetic-dental',
          industry: 'healthcare',
          services: ['veneers', 'implants', 'whitening', 'invisalign', 'smile-makeover', 'crowns'],
          avgDealValue: '$3,000 - $15,000',
          hours: { start: 8, end: 17 },
        },
        behaviors: ['lead-qualify', 'emergency-detect', 'auto-book', 'after-hours', 'return-visitor'],
        decisionInterval: 5000,
      },
      'med-spa': {
        business: {
          type: 'med-spa',
          industry: 'aesthetics',
          services: ['botox', 'fillers', 'laser', 'chemical-peel', 'microneedling', 'body-contouring'],
          avgDealValue: '$500 - $5,000',
          hours: { start: 9, end: 18 },
        },
        behaviors: ['lead-qualify', 'auto-book', 'after-hours', 'return-visitor', 'exit-intent'],
        decisionInterval: 5000,
      },
      'personal-injury-law': {
        business: {
          type: 'personal-injury-law',
          industry: 'legal',
          services: ['car-accident', 'work-injury', 'medical-malpractice', 'slip-fall', 'wrongful-death'],
          avgDealValue: '$10,000 - $100,000+',
          hours: { start: 8, end: 18 },
        },
        behaviors: ['emergency-detect', 'lead-qualify', 'auto-book', 'sms-notify', 'after-hours'],
        decisionInterval: 4000,
      },
      'real-estate': {
        business: {
          type: 'real-estate',
          industry: 'property',
          services: ['buy', 'sell', 'rent', 'appraisal', 'auction', 'property-management'],
          avgDealValue: '$5,000 - $30,000 commission',
          hours: { start: 8, end: 20 },
        },
        behaviors: ['lead-qualify', 'auto-book', 'after-hours', 'return-visitor'],
        decisionInterval: 6000,
      },
    };

    const businessType = typeof config.business === 'string'
      ? config.business
      : config.business?.type;

    const preset = presets[businessType] || {};

    return {
      ...preset,
      ...config,
      business: { ...(preset.business || {}), ...(typeof config.business === 'object' ? config.business : {}) },
      behaviors: config.behaviors || preset.behaviors || ['lead-qualify'],
      decisionInterval: config.decisionInterval || preset.decisionInterval || 5000,
    };
  }

  /**
   * Register Observer events → trigger immediate Brain decisions
   */
  _registerEventHandlers() {
    // High-priority events trigger immediate decisions
    const immediateEvents = [
      'phone-click',
      'exit-intent',
      'cta-click',
      'pricing-interest',
    ];

    immediateEvents.forEach(event => {
      this.observer.on(event, async (data, signals) => {
        const decision = await this.brain.decide(signals);
        await this.actor.execute(decision);
      });
    });

    // Section interest → contextual decision
    this.observer.on('section-interest', async (data, signals) => {
      const decision = await this.brain.decide(signals);
      if (decision.urgency > 5) {
        await this.actor.execute(decision);
      }
    });

    // Idle → re-engage
    this.observer.on('idle', async (data, signals) => {
      const decision = await this.brain.decide(signals);
      await this.actor.execute(decision);
    });
  }

  /**
   * Periodic decision loop — the heartbeat of the Living Website
   */
  _startDecisionLoop() {
    let lastDecisionKey = '';

    this._interval = setInterval(async () => {
      const signals = this.observer.getSignals();

      // Only decide if something meaningful changed
      const currentKey = `${signals.engagementScore}-${signals.maxScrollDepth}-${signals.clickCount}`;
      if (currentKey === lastDecisionKey) return;
      lastDecisionKey = currentKey;

      // Only decide if engagement is above threshold
      if (signals.engagementScore < 15) return;

      const decision = await this.brain.decide(signals);

      // Only act on significant decisions
      if (decision.urgency >= 4 || decision.actions?.length > 0) {
        await this.actor.execute(decision);
      }
    }, this.config.decisionInterval);
  }

  /**
   * Get current state (for debugging)
   */
  getState() {
    return {
      signals: this.observer?.getSignals(),
      config: this.config,
      actionsExecuted: this.actor?.actionsExecuted || [],
      version: this._version,
    };
  }

  /**
   * Stop Living.js
   */
  destroy() {
    if (this._interval) clearInterval(this._interval);
    this.observer?.destroy();
    this.actor?.restore();
    this._initialized = false;
    console.log('[Living.js] Destroyed. Website is static again.');
  }
}

// ─── Global singleton ───────────────────────────────────
const instance = new Living();

// Expose globally
if (typeof window !== 'undefined') {
  window.Living = instance;
}

export default instance;
