/**
 * LIVING.JS — Observer Module
 * Passive behavioral tracking engine
 * 
 * Watches everything. Stores nothing personal.
 * Builds a real-time intent profile of the current visitor.
 * 
 * @author Claude (CTO, Australian Web Agency)
 * @license MIT
 */

export class Observer {
  constructor(config = {}) {
    this.signals = {
      scrollDepth: 0,
      maxScrollDepth: 0,
      timeOnPage: 0,
      timeOnSections: {},
      clicks: [],
      clickCount: 0,
      hoverTargets: [],
      referrer: document.referrer || 'direct',
      source: this._detectSource(),
      device: this._detectDevice(),
      hour: new Date().getHours(),
      isAfterHours: false,
      isWeekend: false,
      isReturning: false,
      visitCount: 0,
      lastVisit: null,
      pageViews: [],
      exitIntentFired: false,
      idleTime: 0,
      engagementScore: 0,
      urgencySignals: [],
      sectionsViewed: new Set(),
      formInteractions: 0,
      phoneClickAttempts: 0,
    };

    this.listeners = [];
    this.sectionObservers = [];
    this.config = config;
    this._startTime = Date.now();
    this._lastActivity = Date.now();
    this._callbacks = new Map();
  }

  /**
   * Start observing. Call once after init.
   */
  start() {
    this._detectReturnVisitor();
    this._detectTimeContext();
    this._trackScroll();
    this._trackClicks();
    this._trackSections();
    this._trackIdle();
    this._trackExitIntent();
    this._trackForms();
    this._startEngagementTimer();

    // Record this visit
    const visits = JSON.parse(localStorage.getItem('_living_visits') || '[]');
    visits.push({ ts: Date.now(), page: location.pathname });
    localStorage.setItem('_living_visits', JSON.stringify(visits.slice(-50)));

    return this;
  }

  /**
   * Register callback for signal changes
   */
  on(event, callback) {
    if (!this._callbacks.has(event)) this._callbacks.set(event, []);
    this._callbacks.get(event).push(callback);
    return this;
  }

  _emit(event, data) {
    const cbs = this._callbacks.get(event) || [];
    cbs.forEach(cb => cb(data, this.signals));
  }

  /**
   * Get current snapshot of all signals
   */
  getSignals() {
    this.signals.timeOnPage = Math.round((Date.now() - this._startTime) / 1000);
    this.signals.engagementScore = this._calculateEngagement();
    return { ...this.signals, sectionsViewed: [...this.signals.sectionsViewed] };
  }

  // ─── SOURCE DETECTION ─────────────────────────────────

  _detectSource() {
    const ref = document.referrer;
    const params = new URLSearchParams(location.search);

    if (params.get('gclid')) return 'google-ads';
    if (params.get('fbclid')) return 'facebook-ads';
    if (params.get('utm_source')) return params.get('utm_source');
    if (!ref) return 'direct';
    if (ref.includes('google')) return 'google-organic';
    if (ref.includes('bing')) return 'bing-organic';
    if (ref.includes('facebook') || ref.includes('fb.com')) return 'facebook';
    if (ref.includes('instagram')) return 'instagram';
    if (ref.includes('linkedin')) return 'linkedin';
    if (ref.includes('tiktok')) return 'tiktok';
    return 'referral';
  }

  _detectDevice() {
    const ua = navigator.userAgent;
    const w = window.innerWidth;
    return {
      type: w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop',
      touch: 'ontouchstart' in window,
      width: w,
      height: window.innerHeight,
    };
  }

  _detectReturnVisitor() {
    const key = '_living_visitor';
    const data = JSON.parse(localStorage.getItem(key) || 'null');

    if (data) {
      this.signals.isReturning = true;
      this.signals.visitCount = (data.count || 0) + 1;
      this.signals.lastVisit = data.lastVisit;
      localStorage.setItem(key, JSON.stringify({
        count: this.signals.visitCount,
        firstVisit: data.firstVisit,
        lastVisit: Date.now(),
      }));
    } else {
      this.signals.visitCount = 1;
      localStorage.setItem(key, JSON.stringify({
        count: 1,
        firstVisit: Date.now(),
        lastVisit: Date.now(),
      }));
    }
  }

  _detectTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const businessHours = this.config.businessHours || { start: 9, end: 17 };

    this.signals.hour = hour;
    this.signals.isAfterHours = hour < businessHours.start || hour >= businessHours.end;
    this.signals.isWeekend = day === 0 || day === 6;

    // Late night browsing = high intent signal for certain businesses
    if (hour >= 22 || hour <= 5) {
      this.signals.urgencySignals.push('late-night-browsing');
    }
  }

  // ─── SCROLL TRACKING ──────────────────────────────────

  _trackScroll() {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const depth = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

        this.signals.scrollDepth = depth;
        if (depth > this.signals.maxScrollDepth) {
          this.signals.maxScrollDepth = depth;
        }

        // Deep scroll = high engagement
        if (depth > 75 && !this.signals.urgencySignals.includes('deep-scroll')) {
          this.signals.urgencySignals.push('deep-scroll');
          this._emit('deep-scroll', { depth });
        }

        this._lastActivity = Date.now();
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    this.listeners.push(['scroll', onScroll]);
  }

  // ─── CLICK TRACKING ───────────────────────────────────

  _trackClicks() {
    const onClick = (e) => {
      const target = e.target.closest('a, button, [data-living], input[type="submit"]');
      if (!target) return;

      const clickData = {
        tag: target.tagName,
        text: (target.textContent || '').trim().slice(0, 80),
        href: target.href || null,
        id: target.id || null,
        classes: target.className || null,
        ts: Date.now(),
        x: e.clientX,
        y: e.clientY,
      };

      this.signals.clicks.push(clickData);
      this.signals.clickCount++;
      this._lastActivity = Date.now();

      // Phone click detection
      if (target.href && target.href.startsWith('tel:')) {
        this.signals.phoneClickAttempts++;
        this.signals.urgencySignals.push('phone-click');
        this._emit('phone-click', clickData);
      }

      // CTA click detection
      if (target.matches('[data-living-cta], .cta, .btn-primary, [class*="book"], [class*="contact"]')) {
        this._emit('cta-click', clickData);
      }

      // Pricing section interaction
      if (target.closest('[data-living-pricing], [class*="pricing"], [class*="price"]')) {
        this.signals.urgencySignals.push('pricing-interest');
        this._emit('pricing-interest', clickData);
      }

      this._emit('click', clickData);
    };

    document.addEventListener('click', onClick, { passive: true });
    this.listeners.push(['click', onClick]);
  }

  // ─── SECTION VISIBILITY TRACKING ──────────────────────

  _trackSections() {
    const sections = document.querySelectorAll(
      'section, [data-living-section], [id]'
    );

    if (!sections.length || !('IntersectionObserver' in window)) return;

    const sectionTimes = {};

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.id || entry.target.dataset.livingSection || 
                   entry.target.tagName + '-' + Array.from(entry.target.parentNode.children).indexOf(entry.target);

        if (entry.isIntersecting) {
          sectionTimes[id] = Date.now();
          this.signals.sectionsViewed.add(id);
          this._emit('section-enter', { id });
        } else if (sectionTimes[id]) {
          const timeSpent = Math.round((Date.now() - sectionTimes[id]) / 1000);
          this.signals.timeOnSections[id] = (this.signals.timeOnSections[id] || 0) + timeSpent;
          delete sectionTimes[id];

          // Long time on a section = high interest
          if (timeSpent > 15) {
            this._emit('section-interest', { id, seconds: timeSpent });
          }
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(s => observer.observe(s));
    this.sectionObservers.push(observer);
  }

  // ─── FORM INTERACTION TRACKING ────────────────────────

  _trackForms() {
    const onFocus = (e) => {
      if (e.target.matches('input, textarea, select')) {
        this.signals.formInteractions++;
        this._lastActivity = Date.now();

        if (this.signals.formInteractions === 1) {
          this._emit('form-start', { field: e.target.name || e.target.type });
        }
      }
    };

    document.addEventListener('focusin', onFocus, { passive: true });
    this.listeners.push(['focusin', onFocus]);
  }

  // ─── IDLE DETECTION ───────────────────────────────────

  _trackIdle() {
    setInterval(() => {
      const idle = Math.round((Date.now() - this._lastActivity) / 1000);
      this.signals.idleTime = idle;

      if (idle > 30 && idle < 35) {
        this._emit('idle', { seconds: idle });
      }
    }, 5000);
  }

  // ─── EXIT INTENT ──────────────────────────────────────

  _trackExitIntent() {
    if (this.signals.device.type === 'mobile') {
      // Mobile: detect back button or tab switch
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && !this.signals.exitIntentFired) {
          this.signals.exitIntentFired = true;
          this._emit('exit-intent', { trigger: 'tab-switch' });
        }
      });
    } else {
      // Desktop: mouse leaves viewport top
      const onLeave = (e) => {
        if (e.clientY < 5 && !this.signals.exitIntentFired) {
          this.signals.exitIntentFired = true;
          this._emit('exit-intent', { trigger: 'mouse-leave' });
        }
      };
      document.addEventListener('mouseout', onLeave);
      this.listeners.push(['mouseout', onLeave]);
    }
  }

  // ─── ENGAGEMENT SCORE ─────────────────────────────────

  _startEngagementTimer() {
    setInterval(() => {
      this.signals.engagementScore = this._calculateEngagement();
    }, 3000);
  }

  _calculateEngagement() {
    let score = 0;
    const s = this.signals;

    // Time on page (max 25 points)
    const timeOnPage = (Date.now() - this._startTime) / 1000;
    score += Math.min(25, Math.round(timeOnPage / 6));

    // Scroll depth (max 20 points)
    score += Math.round(s.maxScrollDepth / 5);

    // Clicks (max 15 points)
    score += Math.min(15, s.clickCount * 3);

    // Sections viewed (max 15 points)
    score += Math.min(15, s.sectionsViewed.size * 3);

    // Form interaction (10 points)
    if (s.formInteractions > 0) score += 10;

    // Return visitor bonus (10 points)
    if (s.isReturning) score += 10;

    // Phone click bonus (5 points)
    if (s.phoneClickAttempts > 0) score += 5;

    return Math.min(100, score);
  }

  // ─── CLEANUP ──────────────────────────────────────────

  destroy() {
    this.listeners.forEach(([event, fn]) => {
      document.removeEventListener(event, fn);
      window.removeEventListener(event, fn);
    });
    this.sectionObservers.forEach(obs => obs.disconnect());
    this._callbacks.clear();
  }
}
