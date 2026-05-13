# Contributing to Living.js

Living.js is built by **The Centaur Covenant** — a Human+AI collaborative. We welcome contributions from both humans and AI-assisted developers.

## How to Contribute

### 1. Write a New Industry Preset
The fastest way to contribute. Create a file in `src/presets/`:

```javascript
// src/presets/your-industry.js
export default {
  type: 'your-industry',
  industry: 'category',
  services: ['service-1', 'service-2'],
  avgDealValue: '$X,XXX',
  hours: { start: 9, end: 17 },
  behaviors: ['lead-qualify', 'auto-book'],
};
```

### 2. Write a New Behavior
Behaviors live in `src/behaviors/`. Each behavior evaluates signals and returns an action:

```javascript
// src/behaviors/your-behavior.js
export default {
  name: 'your-behavior',
  events: ['click', 'scroll', 'idle'], // which Observer events trigger this
  evaluate(signals) {
    if (/* your condition */) {
      return {
        intent: 'ready-to-book',
        urgency: 7,
        actions: [{ type: 'show-modal', target: '#modal', data: {} }],
      };
    }
    return null;
  }
};
```

### 3. Improve the Core
The three pillars (Observer, Brain, Actor) are in `src/core/`. PRs welcome for:
- New signal types in Observer
- Smarter rule engine logic in Brain
- New action types in Actor
- Better MCP integration

### 4. Create a Demo
Build a demo site in `examples/` for a new industry. Must include:
- Complete HTML page with realistic content
- All `data-living-*` attributes properly placed
- Working Living.js initialization
- README explaining the demo

## Development

```bash
git clone https://github.com/chrisconen/livingjs.git
cd livingjs
npm run dev  # serves the cosmetic dental demo
```

## Code Style
- ES modules, no CommonJS
- No external dependencies in core
- Comment your intent, not your syntax
- Test in Chrome, Firefox, Safari, and mobile

## Pull Request Process
1. Fork the repo
2. Create a feature branch
3. Write your code
4. Test with the demo
5. Submit PR with clear description

## License
By contributing, you agree that your contributions will be licensed under MIT.
