/**
 * VELORA — cinematic hero.
 *
 * Progressive enhancement only. The markup + CSS already render a
 * complete, static hero (HERO-02 + full copy) with no JS at all —
 * this script *upgrades* that into the scroll-scrubbed sequence.
 * If GSAP/ScrollTrigger fail to load, or the visitor prefers reduced
 * motion, this simply returns and the static hero stands as-is.
 */
(function () {
  'use strict';

  var heroSection = document.getElementById('hero');
  if (!heroSection) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reducedMotion || !hasGsap || typeof window.VELORA === 'undefined') {
    // Release the inline pre-paint hold (see index.html) immediately
    // rather than waiting on its 3s backstop — we already know for sure
    // the cinematic sequence isn't starting.
    document.documentElement.classList.remove('js-hero-pending');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Scroll-progress phase boundaries (fractions of total hero scroll).
  // Mirrors the visual timeline in master-brand-design.md / hero spec.
  var PHASES = {
    revealEnd: 0.32,     // HERO-01 -> HERO-02 video finishes
    holdEnd: 0.58,       // intentional pause ends, removal + groove entry begins
    copyOutEnd: 0.66,    // typography fully removed

    // Runs to the very end of the hero pin: Origin's pin begins on the next
    // frame, so any static tail here would read as dead scroll at the seam.
    grooveEnd: 1.0,      // HERO-02 -> HERO-03 video finishes

    eyebrowInEnd: 0.08,
    line1In: [0.32, 0.39],
    line2In: [0.335, 0.4],
    supportIn: [0.35, 0.42],
    ctaIn: [0.38, 0.45],
    indicatorFadeEnd: 0.05,

    // Start buffering the Origin handoff video well before the hero ends.
    originWarmAt: 0.5
  };

  // Video scrubbing helpers are shared with the Origin chapter — see cinematic.js.
  var clamp01 = VELORA.clamp01;
  var mapRange = VELORA.mapRange;
  var trackVideo = VELORA.trackVideo;
  var scrubVideo = VELORA.scrubVideo;

  var frame1 = heroSection.querySelector('.hero-media__img[data-frame="1"]');
  var frame2 = heroSection.querySelector('.hero-media__img[data-frame="2"]');
  var frame3 = heroSection.querySelector('.hero-media__img[data-frame="3"]');
  var videoReveal = heroSection.querySelector('.hero-media__video[data-video="reveal"]');
  var videoGroove = heroSection.querySelector('.hero-media__video[data-video="groove"]');
  var eyebrow = heroSection.querySelector('.hero-eyebrow');
  var lines = heroSection.querySelectorAll('.line-text');
  var support = heroSection.querySelector('.hero-support');
  var cta = heroSection.querySelector('.hero-cta');
  var scrollIndicator = heroSection.querySelector('.scroll-indicator');

  var reveal = trackVideo(videoReveal);
  var groove = trackVideo(videoGroove);

  function updateMedia(p) {
    var layers = { frame1: 0, frame2: 0, frame3: 0, videoReveal: 0, videoGroove: 0 };

    if (p <= PHASES.revealEnd) {
      var revealT = mapRange(p, 0, PHASES.revealEnd);
      if (!reveal.failed) {
        layers.videoReveal = 1;
        scrubVideo(reveal, revealT);
      } else {
        layers.frame1 = 1 - revealT;
        layers.frame2 = revealT;
      }
    } else if (p < PHASES.holdEnd) {
      layers.frame2 = 1;
    } else if (p <= PHASES.grooveEnd) {
      var grooveT = mapRange(p, PHASES.holdEnd, PHASES.grooveEnd);
      if (!groove.failed) {
        layers.videoGroove = 1;
        scrubVideo(groove, grooveT);
      } else {
        layers.frame2 = 1 - grooveT;
        layers.frame3 = grooveT;
      }
    } else {
      layers.frame3 = 1;
    }

    gsap.set(frame1, { opacity: layers.frame1 });
    gsap.set(frame2, { opacity: layers.frame2 });
    gsap.set(frame3, { opacity: layers.frame3 });
    gsap.set(videoReveal, { opacity: layers.videoReveal });
    gsap.set(videoGroove, { opacity: layers.videoGroove });
  }

  function updateCopy(p) {
    var copyOut = 1 - mapRange(p, PHASES.holdEnd, PHASES.copyOutEnd);

    var eyebrowIn = mapRange(p, 0, PHASES.eyebrowInEnd);
    gsap.set(eyebrow, { opacity: Math.min(eyebrowIn, copyOut), y: (1 - eyebrowIn) * 16 });

    var line1In = mapRange(p, PHASES.line1In[0], PHASES.line1In[1]);
    var line2In = mapRange(p, PHASES.line2In[0], PHASES.line2In[1]);
    gsap.set(lines[0], { opacity: Math.min(line1In, copyOut), y: ((1 - line1In) * 100) + '%' });
    gsap.set(lines[1], { opacity: Math.min(line2In, copyOut), y: ((1 - line2In) * 100) + '%' });

    var supportIn = mapRange(p, PHASES.supportIn[0], PHASES.supportIn[1]);
    gsap.set(support, { opacity: Math.min(supportIn, copyOut), y: (1 - supportIn) * 16 });

    var ctaIn = mapRange(p, PHASES.ctaIn[0], PHASES.ctaIn[1]);
    gsap.set(cta, { opacity: Math.min(ctaIn, copyOut), y: (1 - ctaIn) * 16 });

    gsap.set(scrollIndicator, { opacity: 1 - mapRange(p, 0, PHASES.indicatorFadeEnd) });
  }

  // The Origin chapter's first video must already be buffering by the time
  // the hero hands off to it, or the seam stalls on a poster frame.
  var originHandoff = document.querySelector('.origin-media__video[data-ovideo="a"]');
  var originWarmed = false;

  function warmOriginHandoff() {
    if (originWarmed || !originHandoff) return;
    originWarmed = true;
    originHandoff.preload = 'auto';
    originHandoff.load();
  }

  function updateHero(p) {
    updateMedia(p);
    updateCopy(p);
    if (p > PHASES.originWarmAt) warmOriginHandoff();
  }

  heroSection.classList.add('hero--cinematic');

  ScrollTrigger.create({
    trigger: heroSection,
    start: 'top top',
    end: 'bottom bottom',
    pin: heroSection.querySelector('.hero-stage'),
    scrub: 1,
    onUpdate: function (self) { updateHero(self.progress); },
    // Drop below Origin exactly when it takes over the viewport, and take
    // the layer back when scrolling returns into the hero.
    onLeave: function () { heroSection.classList.add('hero--handed-off'); },
    onEnterBack: function () { heroSection.classList.remove('hero--handed-off'); }
  });

  updateHero(0);
})();
