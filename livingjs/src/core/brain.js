/**
 * LIVING.JS — Brain Module
 * AI-powered decision engine
 * 
 * Takes Observer signals → produces decisions about what the website should do.
 * Calls the LLM only when needed. Caches patterns. Learns.
 * 
 * @author Claude (CTO, Australian Web Agency)
 * @license MIT
 */

export class Brain {
  constructor(config = {}) {
    this.config = {
      provider: config.ai?.provider || 'anthropic',
      model: config.ai?.model || 'claude-sonnet-4-20250514',
      apiKey: config.ai?.apiKey || null,
      proxyUrl: config.ai?.proxyUrl || null,
      maxTokens: config.ai?.maxTokens || 800,
      ...config,
    };

    this.businessContext = config.business || {};
    this.decisionCache = new Map();
    this.decisionHistory = [];
    this._ruleEngine = new RuleEngine(config);
  }

  /**
   * Main decision method. Takes signals, returns action.
   * Uses rule engine first (fast, free). Falls back to AI (slow, costs tokens).
   */
  async decide(signals) {
    // Step 1: Check cache
    const cacheKey = this._signalFingerprint(signals);
    if (this.decisionCache.has(cacheKey)) {
      return this.decisionCache.get(cacheKey);
    }

    // Step 2: Rule engine (instant, zero cost)
    const ruleDecision = this._ruleEngine.evaluate(signals);
    if (ruleDecision.confidence > 0.8) {
      this._cache(cacheKey, ruleDecision);
      return ruleDecision;
    }

    // Step 3: AI decision (when rules aren't confident enough)
    if (this.config.apiKey || this.config.proxyUrl) {
      try {
        const aiDecision = await this._aiDecide(signals, ruleDecision);
        this._cache(cacheKey, aiDecision);
        return aiDecision;
      } catch (err) {
        console.warn('[Living.js Brain] AI fallback failed:', err.message);
        // Fall through to rule decision even if low confidence
      }
    }

    // Step 4: Return best-effort rule decision
    this._cache(cacheKey, ruleDecision);
    return ruleDecision;
  }

  // ─── RULE ENGINE (Fast Path) ──────────────────────────

  // ─── AI DECISION (Slow Path) ──────────────────────────

  async _aiDecide(signals, ruleHint) {
    const systemPrompt = this._buildSystemPrompt();
    const userPrompt = this._buildUserPrompt(signals, ruleHint);

    const endpoint = this.config.proxyUrl || 'https://api.anthropic.com/v1/messages';
    const headers = {
      'Content-Type': 'application/json',
    };

    if (!this.config.proxyUrl && this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return this._parseAiResponse(text, signals);
  }

  _buildSystemPrompt() {
    const biz = this.config.businessContext || this.config.business || {};

    return `You are the decision engine for a Living Website — an autonomous AI-powered business website.

BUSINESS CONTEXT:
- Type: ${biz.type || 'service business'}
- Industry: ${biz.industry || 'general'}
- Location: ${biz.location || 'not specified'}
- Services: ${JSON.stringify(biz.services || [])}
- Business hours: ${JSON.stringify(biz.hours || { start: 9, end: 17 })}
- Average deal value: ${biz.avgDealValue || 'unknown'}

YOUR JOB: Analyze visitor behavior signals and decide what the website should DO next.
You are not a chatbot. You control the website itself — morphing CTAs, surfacing relevant content, triggering bookings.

RESPOND WITH VALID JSON ONLY. No markdown, no explanation. Schema:
{
  "intent": "browsing|considering|ready-to-book|emergency|price-shopping|returning-client",
  "urgency": 1-10,
  "actions": [
    {
      "type": "show-element|hide-element|swap-cta|show-modal|trigger-mcp|highlight-section|reorder-sections",
      "target": "CSS selector or element ID",
      "data": { ...action-specific data }
    }
  ],
  "message": "optional personalized message to display",
  "reasoning": "one sentence why"
}`;
  }

  _buildUserPrompt(signals, ruleHint) {
    return `VISITOR SIGNALS (real-time):
- Time on page: ${signals.timeOnPage}s
- Scroll depth: ${signals.maxScrollDepth}%
- Clicks: ${signals.clickCount} (phone attempts: ${signals.phoneClickAttempts})
- Device: ${signals.device?.type || 'unknown'}
- Hour: ${signals.hour} (after hours: ${signals.isAfterHours}, weekend: ${signals.isWeekend})
- Source: ${signals.source}
- Returning visitor: ${signals.isReturning} (visit #${signals.visitCount})
- Sections viewed: ${JSON.stringify(signals.sectionsViewed || [])}
- Engagement score: ${signals.engagementScore}/100
- Urgency signals: ${JSON.stringify(signals.urgencySignals || [])}
- Form interactions: ${signals.formInteractions}
- Section time: ${JSON.stringify(signals.timeOnSections || {})}

RULE ENGINE HINT: ${JSON.stringify(ruleHint)}

What should the website do RIGHT NOW?`;
  }

  _parseAiResponse(text, signals) {
    try {
      // Strip markdown fences if present
      const clean = text.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(clean);

      return {
        ...parsed,
        confidence: 0.9,
        source: 'ai',
        timestamp: Date.now(),
      };
    } catch (e) {
      // If AI returns non-JSON, create a basic decision
      return {
        intent: 'browsing',
        urgency: 3,
        actions: [],
        message: null,
        confidence: 0.5,
        source: 'ai-fallback',
        timestamp: Date.now(),
      };
    }
  }

  // ─── CACHING ──────────────────────────────────────────

  _signalFingerprint(signals) {
    // Create a coarse fingerprint — we don't need exact match
    const parts = [
      signals.device?.type || 'unknown',
      signals.isAfterHours ? 'after' : 'during',
      signals.isReturning ? 'return' : 'new',
      Math.round(signals.engagementScore / 20) * 20, // bucket by 20
      Math.round(signals.maxScrollDepth / 25) * 25,  // bucket by 25
      signals.phoneClickAttempts > 0 ? 'phone' : 'no-phone',
      signals.source,
    ];
    return parts.join('|');
  }

  _cache(key, decision) {
    this.decisionCache.set(key, decision);
    this.decisionHistory.push({ key, decision, ts: Date.now() });

    // Keep cache manageable
    if (this.decisionCache.size > 100) {
      const firstKey = this.decisionCache.keys().next().value;
      this.decisionCache.delete(firstKey);
    }
  }
}


/**
 * Rule Engine — fast, deterministic decisions without AI calls
 * Handles the 80% of cases that don't need LLM intelligence
 */
class RuleEngine {
  constructor(config = {}) {
    this.config = config;
    this.rules = this._buildRules();
  }

  evaluate(signals) {
    const matched = [];

    for (const rule of this.rules) {
      const result = rule.test(signals);
      if (result) {
        matched.push({ ...result, rule: rule.name });
      }
    }

    if (matched.length === 0) {
      return {
        intent: 'browsing',
        urgency: 1,
        actions: [],
        confidence: 0.3,
        source: 'rules-default',
        timestamp: Date.now(),
      };
    }

    // Return highest urgency match
    matched.sort((a, b) => b.urgency - a.urgency);
    return {
      ...matched[0],
      confidence: Math.min(0.95, 0.6 + matched.length * 0.1),
      source: 'rules',
      timestamp: Date.now(),
    };
  }

  _buildRules() {
    return [
      // ─── EMERGENCY: phone clicks + after hours + high scroll
      {
        name: 'emergency-after-hours',
        test: (s) => {
          if (s.phoneClickAttempts >= 2 && s.isAfterHours) {
            return {
              intent: 'emergency',
              urgency: 10,
              actions: [
                { type: 'show-modal', target: '#living-emergency-modal', data: { template: 'emergency-callback' } },
                { type: 'trigger-mcp', target: 'sms', data: { type: 'emergency-lead' } },
              ],
              message: "Can't reach us by phone? Leave your number — we'll call you first thing.",
            };
          }
        }
      },

      // ─── HIGH INTENT: deep scroll + pricing interest + high engagement
      {
        name: 'ready-to-book',
        test: (s) => {
          if (s.engagementScore > 70 && s.maxScrollDepth > 60 &&
              s.urgencySignals.includes('pricing-interest')) {
            return {
              intent: 'ready-to-book',
              urgency: 8,
              actions: [
                { type: 'swap-cta', target: '[data-living-cta]', data: { text: 'Book Your Free Consultation →', style: 'urgent' } },
                { type: 'highlight-section', target: '#booking, [data-living-booking]', data: {} },
              ],
              message: null,
            };
          }
        }
      },

      // ─── RETURN VISITOR: personalize
      {
        name: 'returning-welcome',
        test: (s) => {
          if (s.isReturning && s.visitCount >= 3) {
            return {
              intent: 'returning-client',
              urgency: 6,
              actions: [
                { type: 'swap-cta', target: '[data-living-cta]', data: { text: 'Welcome Back — Ready to Get Started?', style: 'warm' } },
              ],
              message: "Welcome back! You've been thinking about this. Let's make it happen.",
            };
          }
        }
      },

      // ─── PRICE SHOPPING: quick scroll, pricing focus, low engagement
      {
        name: 'price-comparison',
        test: (s) => {
          if (s.urgencySignals.includes('pricing-interest') &&
              s.timeOnPage < 30 && s.engagementScore < 30) {
            return {
              intent: 'price-shopping',
              urgency: 4,
              actions: [
                { type: 'show-element', target: '[data-living-value-prop]', data: {} },
                { type: 'highlight-section', target: '#testimonials, [data-living-social-proof]', data: {} },
              ],
              message: null,
            };
          }
        }
      },

      // ─── AFTER HOURS BROWSING: surface self-service options
      {
        name: 'after-hours-general',
        test: (s) => {
          if (s.isAfterHours && s.engagementScore > 30) {
            return {
              intent: 'considering',
              urgency: 5,
              actions: [
                { type: 'show-element', target: '[data-living-after-hours]', data: {} },
                { type: 'swap-cta', target: '[data-living-cta]', data: { text: 'Book Online — Available 24/7', style: 'default' } },
              ],
              message: "We're currently closed, but you can book online anytime.",
            };
          }
        }
      },

      // ─── EXIT INTENT: engaged visitor about to leave
      {
        name: 'exit-intent-engaged',
        test: (s) => {
          if (s.exitIntentFired && s.engagementScore > 40 && s.formInteractions === 0) {
            return {
              intent: 'considering',
              urgency: 7,
              actions: [
                { type: 'show-modal', target: '#living-exit-modal', data: { template: 'exit-offer' } },
              ],
              message: "Before you go — would you like a free consultation?",
            };
          }
        }
      },

      // ─── MOBILE LATE NIGHT: likely urgent
      {
        name: 'mobile-late-night',
        test: (s) => {
          if (s.device?.type === 'mobile' && s.urgencySignals.includes('late-night-browsing')) {
            return {
              intent: 'emergency',
              urgency: 7,
              actions: [
                { type: 'show-element', target: '[data-living-emergency]', data: {} },
                { type: 'reorder-sections', target: null, data: { first: '#booking, [data-living-booking]' } },
              ],
              message: null,
            };
          }
        }
      },

      // ─── IDLE VISITOR: re-engage
      {
        name: 'idle-reengage',
        test: (s) => {
          if (s.idleTime > 30 && s.engagementScore > 20 && s.engagementScore < 60) {
            return {
              intent: 'browsing',
              urgency: 3,
              actions: [
                { type: 'show-element', target: '[data-living-nudge]', data: {} },
              ],
              message: "Still looking? We can help you find exactly what you need.",
            };
          }
        }
      },
    ];
  }
}
