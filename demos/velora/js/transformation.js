/**
 * VELORA — Chapter 02, TRANSFORMATION (from cherry to bean).
 *
 * Continues the camera from Origin's ripe cherry into the fruit's anatomy:
 * macro cherry -> cross-section -> exploded botany -> a single green bean.
 *
 * Progressive enhancement, same contract as Hero and Origin: the markup +
 * CSS already render a readable stacked chapter (stills + all copy) with no
 * JS. This upgrades that into the pinned, scroll-scrubbed sequence.
 */
(function () {
  'use strict';

  var section = document.getElementById('transformation');
  if (!section) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reducedMotion || !hasGsap || typeof window.VELORA === 'undefined') return;

  var mapRange = VELORA.mapRange;
  var trackVideo = VELORA.trackVideo;
  var warmVideo = VELORA.warmVideo;

  /**
   * Scroll-progress phases (fractions of the chapter's total scroll).
   *
   * The four source videos join on visibly different frames (measured 9-16dB
   * PSNR across the seams — looser than Origin's), so each handoff crossfades
   * inside the preceding hold, where the camera is static and the blend reads
   * as depth rather than as a cut.
   */
  var PHASES = {
    videoA: [0.00, 0.14],   // ripe cherry -> extreme macro
    holdA:  [0.14, 0.22],   // CHERRY-01
    videoB: [0.22, 0.43],   // macro -> cross-section
    holdB:  [0.43, 0.50],   // CHERRY-02
    videoC: [0.50, 0.72],   // cross-section -> exploded anatomy
    holdC:  [0.72, 0.81],   // CHERRY-03, the luxury-science beat
    videoD: [0.81, 0.96],   // anatomy dissolves -> single green bean
    // 0.96 -> 1 holds CHERRY-04

    // Seams straddle the start of the incoming movement, so the new shot is
    // already moving as it finishes arriving — motion masks a transition far
    // better than a static hold does.
    fadeToB: [0.200, 0.250],
    fadeToC: [0.475, 0.525],
    fadeToD: [0.790, 0.840],

    chapterIn:   [0.150, 0.200],
    chapterOut:  [0.930, 0.975],
    headline1In: [0.170, 0.240],
    headline2In: [0.185, 0.255],
    supportIn:   [0.200, 0.270],
    introOut:    [0.260, 0.340],
    specimenIn:  [0.440, 0.490],
    specimenOut: [0.530, 0.600],

    // Labels arrive while the anatomy is still separating, then hold.
    layersIn:    [0.620, 0.740],
    layersOut:   [0.830, 0.895],

    // Window must leave room for the per-line stagger to finish before 1.0,
    // or the last line never reaches full opacity at the end of the chapter.
    closingIn:   [0.950, 0.978],

    warmB: 0.06,
    warmC: 0.28,
    warmD: 0.56,

    // Start buffering the Roast handoff video before this chapter ends.
    warmNextChapterAt: 0.62
  };

  /** Per-label stagger inside PHASES.layersIn, as a fraction of that window. */
  var LAYER_STAGGER = 0.5;
  var LAYER_BASE_OPACITY = 0.42;

  var frames = {
    open: section.querySelector('.transformation-frame[data-tframe="0"]'),
    a: section.querySelector('.transformation-frame[data-tframe="1"]'),
    b: section.querySelector('.transformation-frame[data-tframe="2"]'),
    c: section.querySelector('.transformation-frame[data-tframe="3"]'),
    d: section.querySelector('.transformation-frame[data-tframe="4"]')
  };

  var videoEls = {
    a: section.querySelector('.transformation-media__video[data-tvideo="a"]'),
    b: section.querySelector('.transformation-media__video[data-tvideo="b"]'),
    c: section.querySelector('.transformation-media__video[data-tvideo="c"]'),
    d: section.querySelector('.transformation-media__video[data-tvideo="d"]')
  };

  var videos = {
    a: trackVideo(videoEls.a),
    b: trackVideo(videoEls.b),
    c: trackVideo(videoEls.c),
    d: trackVideo(videoEls.d)
  };

  var chapter = section.querySelector('.transformation-chapter');
  var headlineLines = section.querySelectorAll('.transformation-headline .line-text');
  var support = section.querySelector('.transformation-support');
  var specimen = section.querySelector('.transformation-specimen');
  var layerList = section.querySelector('.transformation-layers');
  var layerItems = section.querySelectorAll('.transformation-layer');
  var closingLines = section.querySelectorAll('.transformation-closing .line-text');

  var mediaLayers = [
    videoEls.a, videoEls.b, videoEls.c, videoEls.d,
    frames.open, frames.a, frames.b, frames.c, frames.d
  ];

  /**
   * All three seams here are genuine shot changes (dark macro -> daylight
   * orchard, cross-section -> intact fruit, wide anatomy -> small anatomy),
   * so they pass through darkness rather than cross-dissolving: two
   * different shots blended at once read as a double exposure.
   */
  var updateMedia = VELORA.createMediaSequence({
    segments: [
      { state: videos.a, from: frames.open, to: frames.a, range: PHASES.videoA },
      { state: videos.b, from: frames.a, to: frames.b, range: PHASES.videoB },
      { state: videos.c, from: frames.b, to: frames.c, range: PHASES.videoC },
      { state: videos.d, from: frames.c, to: frames.d, range: PHASES.videoD }
    ],
    seams: [PHASES.fadeToB, PHASES.fadeToC, PHASES.fadeToD],
    style: 'through-dark',
    layers: mediaLayers
  });

  function reveal(el, inRange, outRange, p, shiftPx) {
    var into = mapRange(p, inRange[0], inRange[1]);
    var away = outRange ? 1 - mapRange(p, outRange[0], outRange[1]) : 1;
    gsap.set(el, {
      opacity: Math.min(into, away),
      y: (1 - into) * (shiftPx === undefined ? 14 : shiftPx)
    });
  }

  /** Masked vertical reveal shared by the headline and the closing statement. */
  function revealMaskedLines(lines, inRange, outRange, p, stagger) {
    var span = inRange[1] - inRange[0];
    var away = outRange ? 1 - mapRange(p, outRange[0], outRange[1]) : 1;
    for (var i = 0; i < lines.length; i++) {
      var start = inRange[0] + span * stagger * i;
      var into = mapRange(p, start, start + span);
      gsap.set(lines[i], {
        opacity: Math.min(into, away),
        y: ((1 - into) * 100) + '%'
      });
    }
  }

  /**
   * The six botanical layers fade in one after another while the anatomy is
   * still separating, then the one matching scroll position lifts slightly
   * above the rest. Opacity only — no active-state chrome.
   */
  function updateLayers(p) {
    var listIn = mapRange(p, PHASES.layersIn[0], PHASES.layersIn[1]);
    var listAway = 1 - mapRange(p, PHASES.layersOut[0], PHASES.layersOut[1]);
    gsap.set(layerList, { opacity: Math.min(listIn > 0 ? 1 : 0, listAway) });

    var span = PHASES.layersIn[1] - PHASES.layersIn[0];
    var step = (span * LAYER_STAGGER) / Math.max(layerItems.length - 1, 1);

    // Which layer the eye should be on, tracked across the reveal and hold.
    var focus = mapRange(p, PHASES.layersIn[0], PHASES.holdC[1]) * layerItems.length;
    var activeIndex = Math.min(Math.floor(focus), layerItems.length - 1);

    for (var i = 0; i < layerItems.length; i++) {
      var start = PHASES.layersIn[0] + step * i;
      var into = mapRange(p, start, start + span * (1 - LAYER_STAGGER));
      var isActive = i === activeIndex;
      gsap.set(layerItems[i], {
        opacity: into * (isActive ? 1 : LAYER_BASE_OPACITY),
        x: (1 - into) * -10
      });
      // Mobile shows only the active item, so mark it as soon as it is
      // legible rather than waiting for the reveal to finish.
      layerItems[i].classList.toggle('is-active', isActive && into > 0.15);
    }
  }

  function updateCopy(p) {
    reveal(chapter, PHASES.chapterIn, PHASES.chapterOut, p, 8);
    revealMaskedLines(headlineLines, PHASES.headline1In, PHASES.introOut, p, 0.22);
    reveal(support, PHASES.supportIn, PHASES.introOut, p, 12);
    reveal(specimen, PHASES.specimenIn, PHASES.specimenOut, p, 10);
    updateLayers(p);
    revealMaskedLines(closingLines, PHASES.closingIn, null, p, 0.3);
  }

  // The Roast chapter's first video must already be buffering by the time
  // this chapter hands off, or the seam stalls on a poster frame.
  var nextHandoff = document.querySelector('.roast-media__video[data-rvideo="a"]');
  var nextWarmed = false;

  function warmNextChapter() {
    if (nextWarmed || !nextHandoff) return;
    nextWarmed = true;
    nextHandoff.preload = 'auto';
    nextHandoff.load();
  }

  function updateTransformation(p) {
    updateMedia(p);
    updateCopy(p);
    if (p > PHASES.warmB) warmVideo(videos.b);
    if (p > PHASES.warmC) warmVideo(videos.c);
    if (p > PHASES.warmD) warmVideo(videos.d);
    if (p > PHASES.warmNextChapterAt) warmNextChapter();
  }

  section.classList.add('transformation--cinematic');

  // origin.js warms video A as its chapter closes, which covers the normal
  // top-down read. This is the safety net for anyone arriving with Origin
  // already behind them (deep link, restored scroll, back navigation).
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom+=100%',
    once: true,
    onEnter: function () { warmVideo(videos.a); }
  });

  var pinTrigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    pin: section.querySelector('.transformation-stage'),
    scrub: 1,
    onUpdate: function (self) { updateTransformation(self.progress); },
    // Drop below Roast exactly when it takes over the viewport, and take the
    // layer back when scrolling returns into this chapter.
    onLeave: function () { section.classList.add('transformation--handed-off'); },
    onEnterBack: function () { section.classList.remove('transformation--handed-off'); }
  });

  // Layer opacity is otherwise only recomputed on scroll, so a video that
  // finishes buffering while the visitor sits still would leave the stale
  // fallback on screen until they moved again.
  ['a', 'b', 'c', 'd'].forEach(function (key) {
    videos[key].el.addEventListener('loadedmetadata', function () {
      updateTransformation(pinTrigger.progress);
    });
  });

  updateTransformation(0);
})();
