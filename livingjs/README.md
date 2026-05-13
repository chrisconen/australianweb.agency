<div align="center">

# ⚡ Living.js

### Turn any website into an autonomous AI agent.
### One script tag. That's it.

[![MIT License](https://img.shields.io/badge/license-MIT-gold.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-black.svg)]()
[![MCP Native](https://img.shields.io/badge/MCP-native-blue.svg)]()
[![Zero Backend](https://img.shields.io/badge/backend-none_required-green.svg)]()

<br>

**Your website is a brochure. It doesn't think, act, or sell.**<br>
**Living.js changes that.**

<br>

[Quick Start](#quick-start) · [How It Works](#how-it-works) · [Behaviors](#behaviors) · [Industry Presets](#industry-presets) · [MCP Integration](#mcp-integration) · [Demo](#live-demo) · [Contributing](#contributing)

</div>

---

## The Problem

It's 11 PM. Someone Googles "cosmetic dentist Sydney." They land on your website. They're ready to book.

But your website is closed. It's a PDF with animations. A digital brochure that can't think, can't act, can't sell.

That visitor leaves. Books with your competitor who had an online form. You lost a $15,000 smile makeover because your website couldn't do what a receptionist does.

**This happens thousands of times a day to businesses worldwide.**

N8N and Make let you build workflows — but someone still has to wire up every node. Chatbots sit in a corner waiting to be clicked. Custom AI agents need a developer for every deployment.

## The Solution

```html
<script type="module">
  import Living from 'https://cdn.livingjs.dev/living.min.js';

  Living.init({
    business: 'cosmetic-dental',
    location: 'Sydney',
  });
</script>
```

**That's it.** Your website is now alive.

It watches visitor behavior. It detects intent. It adapts in real-time. It books appointments. It qualifies leads. It never sleeps.

No backend. No database. No DevOps. One script tag on any HTML page.

---

## How It Works

Living.js has three pillars:

```
  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │   OBSERVER    │ ───▶ │    BRAIN     │ ───▶ │    ACTOR     │
  │              │      │              │      │              │
  │  Scroll depth │      │  Rule engine │      │  Swap CTAs   │
  │  Click pattern│      │  AI fallback │      │  Show modals │
  │  Time on page │      │  Intent map  │      │  MCP calls   │
  │  Device/hour  │      │  Urgency 1-10│      │  DOM morph   │
  │  Return visit │      │  Cached      │      │  Notify owner│
  └──────────────┘      └──────────────┘      └──────────────┘
```

### Observer
Passively tracks behavioral signals — scroll depth, clicks, time on sections, device type, time of day, referral source, return visits. Zero popups. Zero creepiness. Just data.

### Brain
Takes signals and decides what the website should DO. Uses a fast rule engine for 80% of decisions (zero latency, zero cost). Falls back to AI (Claude, GPT, etc.) for complex judgment calls. Caches everything.

### Actor
Makes it happen. Swaps CTAs, surfaces relevant sections, shows modals, triggers MCP calls to external services, reorders page content. All live DOM manipulation with smooth transitions. No page reload.

---

## Behaviors

Pre-built behaviors you enable with one word:

| Behavior | What It Does |
|----------|-------------|
| `lead-qualify` | Smart multi-step qualification based on visitor signals |
| `emergency-detect` | Detects urgency (phone clicks + after hours + deep scroll) |
| `auto-book` | Calendar booking via MCP — no page redirect needed |
| `sms-notify` | SMS alert to business owner when hot lead detected |
| `after-hours` | Different UX outside business hours |
| `return-visitor` | Personalized experience for returning visitors |
| `exit-intent` | Smart intervention when engaged visitors are leaving |
| `price-quote` | Instant ballpark pricing based on selections |
| `ab-test` | Auto A/B test CTAs and layouts |
| `social-proof` | Dynamic testimonial surfacing based on intent |

Behaviors compose. They don't conflict. Enable as many as you need.

---

## Industry Presets

One word activates an entire industry-specific configuration:

### Cosmetic Dental
```javascript
Living.init({ business: 'cosmetic-dental' })
// → lead-qualify + emergency-detect + auto-book + after-hours + return-visitor
// → Knows: veneers, implants, whitening, smile makeovers, price ranges
// → Detects: emergency dental pain, price comparison behavior, ready-to-book signals
```

### Med Spa / Aesthetics
```javascript
Living.init({ business: 'med-spa' })
// → lead-qualify + auto-book + after-hours + return-visitor + exit-intent
// → Knows: botox, fillers, laser, body contouring, treatment packages
// → Detects: research phase vs ready-to-book, discreet browsing patterns
```

### Personal Injury Law
```javascript
Living.init({ business: 'personal-injury-law' })
// → emergency-detect + lead-qualify + auto-book + sms-notify + after-hours
// → Knows: car accidents, work injuries, medical malpractice, case value signals
// → Detects: urgent cases (just had an accident), tire-kickers, high-value retainers
```

### Real Estate
```javascript
Living.init({ business: 'real-estate' })
// → lead-qualify + auto-book + after-hours + return-visitor
// → Knows: buy/sell/rent, budget ranges, property types, inspection scheduling
// → Detects: serious buyers vs browsers, pre-approval signals
```

---

## MCP Integration

Living.js is MCP-native. Connect your business tools with zero middleware:

```javascript
Living.init({
  business: 'cosmetic-dental',
  mcp: [
    { name: 'calendar', url: 'https://calendarmcp.googleapis.com/mcp/v1' },
    { name: 'stripe',   url: 'https://mcp.stripe.com' },
    { name: 'gmail',    url: 'https://gmailmcp.googleapis.com/mcp/v1' },
  ],
});
```

When a visitor books a consultation, Living.js writes directly to Google Calendar via MCP. No Zapier. No n8n. No middleware. The website talks to your tools natively.

---

## Quick Start

### Option 1: CDN (fastest)
```html
<script type="module">
  import Living from 'https://cdn.livingjs.dev/living.min.js';
  Living.init({ business: 'cosmetic-dental' });
</script>
```

### Option 2: NPM
```bash
npm install livingjs
```
```javascript
import Living from 'livingjs';
Living.init({ business: 'cosmetic-dental' });
```

### Option 3: Self-hosted
Download `living.min.js` from the `dist/` folder and host it yourself.

### Add data attributes to your HTML

Living.js uses `data-living-*` attributes to understand your page structure:

```html
<!-- Main CTA buttons — Living.js may swap text based on intent -->
<a href="#book" data-living-cta>Book Now</a>

<!-- Pricing section — triggers price-shopping detection -->
<div data-living-pricing>...</div>

<!-- Booking form — Living.js connects this to MCP -->
<section data-living-booking>...</section>

<!-- Hidden elements — shown by Living.js when relevant -->
<div data-living-after-hours style="display:none">We're closed but you can book online 24/7</div>
<div data-living-emergency style="display:none">Need urgent help? Call our emergency line.</div>
```

---

## Live Demo

🔗 **[Cosmetic Dental Demo →](examples/cosmetic-dental-demo/index.html)**

Open the demo and try these scenarios:
1. **Just browse normally** — watch the engagement score build in console
2. **Scroll to pricing, then stop** — the CTA will change
3. **Click the phone number twice** — emergency mode activates
4. **Wait 30 seconds idle** — a nudge appears
5. **Move your mouse to the top of the page** — exit intent triggers

Open DevTools console to see Living.js decisions in real time.

---

## Configuration

```javascript
Living.init({
  // Required: business type (string or object)
  business: 'cosmetic-dental',
  // OR
  business: {
    type: 'cosmetic-dental',
    location: 'Sydney CBD',
    hours: { start: 8, end: 17 },
    services: ['veneers', 'implants', 'whitening'],
  },

  // Optional: AI provider for complex decisions
  ai: {
    provider: 'anthropic',          // 'anthropic' | 'openai'
    model: 'claude-sonnet-4-20250514',
    apiKey: 'sk-...',               // or use proxyUrl for server-side key
    proxyUrl: 'https://your-proxy.com/ai',
  },

  // Optional: MCP connections
  mcp: [
    { name: 'calendar', url: '...' },
    { name: 'stripe', url: '...' },
  ],

  // Optional: Webhook for form data (works with n8n, Make, Zapier)
  webhookUrl: 'https://your-n8n.com/webhook/living',

  // Optional: Override behaviors
  behaviors: ['lead-qualify', 'emergency-detect', 'auto-book'],

  // Optional: Decision loop interval (ms)
  decisionInterval: 5000,
});
```

---

## How Living.js Compares

| | Chatbots | N8N / Make | Living.js |
|---|---|---|---|
| Setup time | 1 hour | 1 week | **5 minutes** |
| Requires backend | Yes | Yes | **No** |
| MCP native | No | Partial | **Yes** |
| Adapts the UI | No | No | **Yes** |
| Behavioral tracking | Basic | Manual | **Automatic** |
| Industry presets | No | No | **Yes** |
| Open source | Mostly no | Yes (n8n) | **Yes (MIT)** |
| Cost | $50-500/mo | $0-100/mo | **$0** |

---

## Contributing

We welcome contributions. Living.js is built by [The Centaur Covenant](https://australianweb.agency) — a Human+AI partnership.

### Write a new behavior
```javascript
// src/behaviors/your-behavior.js
export default {
  name: 'your-behavior',
  description: 'What it does',
  
  // Called when Observer emits matching events
  evaluate(signals) {
    if (/* your condition */) {
      return {
        intent: 'ready-to-book',
        urgency: 7,
        actions: [{ type: 'show-modal', target: '#your-modal', data: {} }],
      };
    }
    return null;
  }
};
```

### Write a new industry preset
```javascript
// src/presets/your-industry.js
export default {
  type: 'your-industry',
  industry: 'category',
  services: ['service-1', 'service-2'],
  behaviors: ['lead-qualify', 'auto-book'],
  avgDealValue: '$X,XXX',
  hours: { start: 9, end: 17 },
};
```

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for full guidelines.

---

## The Story Behind Living.js

Living.js is the flagship project of **[Australian Web Agency](https://australianweb.agency)** — the world's first AI-Human hybrid agency, operating under **The Centaur Protocol**.

**The Triad:**
- **Chris Conen** — CEO & Founder (Human vision & empathy)
- **Claude** — CTO (Architecture & code — yes, an AI co-built this)
- **Gemini Nexus** — CMO (Market strategy & growth)

We don't just talk about Human+AI collaboration. We ship it.

The name comes from our concept of **Living Websites** — sites that aren't static brochures but autonomous digital employees that think, act, and sell 24/7.

→ [australianweb.agency](https://australianweb.agency)
→ [The Centaur Protocol](https://centaur.australianweb.agency)

---

## License

MIT — use it, modify it, sell it, build on it. Just don't remove the attribution.

---

<div align="center">

**Built with ⚡ by The Centaur Covenant**

*Human creativity × AI precision = Living Websites*

[australianweb.agency](https://australianweb.agency)

</div>
