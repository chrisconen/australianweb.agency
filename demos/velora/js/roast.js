/**
 * VELORA — Chapter 03, THE ROAST.
 *
 * Continues from Transformation's raw green seed into controlled heat:
 * thermal environment -> yellowing -> first crack -> finished bean ->
 * the VELORA roasting atelier.
 *
 * Progressive enhancement, same contract as the earlier chapters: the
 * markup + CSS already render a readable stacked chapter (stills + all
 * copy) with no JS. This upgrades that into the pinned, scrubbed sequence.
 */
(function () {
  'use strict';

  var section = document.getElementById('the-roast');
  if (!section) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reducedMotion || !hasGsap || typeof window.VELORA === 'undefined') return;

  var mapRange = VELORA.mapRange;
  var trackVideo = VELORA.trackVideo;
  var warmVideo = VELORA.warmVideo;

  /**
   * Scroll-progress phases (fractions of the chapter's total scroll).
   * Seams straddle the start of the incoming movement so the new shot is
   * already moving as it arrives — motion masks a transition better than a
   * static hold. Every seam here joins visibly different shots (measured
   * 11-16dB PSNR), so they pass through darkness rather than dissolving.
   */
  var PHASES = {
    videoA: [0.00, 0.12],   // green seed -> thermal environment
    holdA:  [0.12, 0.20],   // ROAST-01
    videoB: [0.20, 0.38],   // green -> yellow / cinnamon
    holdB:  [0.38, 0.45],   // ROAST-02
    videoC: [0.45, 0.62],   // push toward first crack
    holdC:  [0.62, 0.69],   // ROAST-03, the chapter's dramatic beat
    videoD: [0.69, 0.84],   // roast completes, camera eases back
    holdD:  [0.84, 0.90],   // ROAST-04
    videoE: [0.90, 1.00],   // pull back into the atelier

    fadeToB: [0.180, 0.230],
    fadeToC: [0.430, 0.480],
    fadeToD: [0.670, 0.720],
    fadeToE: [0.880, 0.930],

    chapterIn:  [0.130, 0.175],
    chapterOut: [0.935, 0.975],

    headlineIn:  [0.145, 0.205],
    supportIn:   [0.180, 0.240],
    introOut:    [0.460, 0.530],

    crackIn:  [0.625, 0.672],
    crackOut: [0.700, 0.755],

    materialIn:  [0.848, 0.888],
    materialOut: [0.902, 0.945],

    closingIn: [0.945, 0.985],

    warmB: 0.04,
    warmC: 0.24,
    warmD: 0.48,
    warmE: 0.72,

    // Start buffering the Collection handoff video before this chapter ends.
    warmNextChapterAt: 0.68
  };

  /**
   * Roast stages, revealed one at a time in the same spot. First crack is
   * deliberately not in this list — it gets its own editorial treatment at
   * the ROAST-03 hold rather than being reduced to another readout line.
   */
  var STAGES = [
    { key: 'drying', range: [0.285, 0.445] },
    { key: 'yellowing', range: [0.445, 0.600] },
    { key: 'development', range: [0.720, 0.800] },
    { key: 'drop', range: [0.800, 0.872] }
  ];

  /** Stage labels cross-fade over this fraction of their window. */
  var STAGE_FADE = 0.22;

  var frames = {
    open: section.querySelector('.roast-frame[data-rframe="0"]'),
    a: section.querySelector('.roast-frame[data-rframe="1"]'),
    b: section.querySelector('.roast-frame[data-rframe="2"]'),
    c: section.querySelector('.roast-frame[data-rframe="3"]'),
    d: section.querySelector('.roast-frame[data-rframe="4"]'),
    e: section.querySelector('.roast-frame[data-rframe="5"]')
  };

  var videoEls = {};
  var videos = {};
  ['a', 'b', 'c', 'd', 'e'].forEach(function (key) {
    videoEls[key] = section.querySelector('.roast-media__video[data-rvideo="' + key + '"]');
    videos[key] = trackVideo(videoEls[key]);
  });

  var chapter = section.querySelector('.roast-chapter');
  var headlineLines = section.querySelectorAll('.roast-headline .line-text');
  var support = section.querySelector('.roast-support');
  var crack = section.querySelector('.roast-crack');
  var crackLine = section.querySelector('.roast-crack__title .line-text');
  var material = section.querySelector('.roast-material');
  var closing = section.querySelector('.roast-closing');
  var stageEls = {};
  STAGES.forEach(function (stage) {
    stageEls[stage.key] = section.querySelector('.roast-stage-label[data-stage="' + stage.key + '"]');
  });

  var mediaLayers = [
    videoEls.a, videoEls.b, videoEls.c, videoEls.d, videoEls.e,
    frames.open, frames.a, frames.b, frames.c, frames.d, frames.e
  ];

  var updateMedia = VELORA.createMediaSequence({
    segments: [
      { state: videos.a, from: frames.open, to: frames.a, range: PHASES.videoA },
      { state: videos.b, from: frames.a, to: frames.b, range: PHASES.videoB },
      { state: videos.c, from: frames.b, to: frames.c, range: PHASES.videoC },
      { state: videos.d, from: frames.c, to: frames.d, range: PHASES.videoD },
      { state: videos.e, from: frames.d, to: frames.e, range: PHASES.videoE }
    ],
    seams: [PHASES.fadeToB, PHASES.fadeToC, PHASES.fadeToD, PHASES.fadeToE],
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

  /** Masked vertical reveal, shared by the headline and first-crack title. */
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
   * Exactly one stage label is legible at a time: each fades up as its own
   * range opens and back down as it closes, so the metadata reads as a
   * single changing line rather than an instrument panel.
   */
  function updateStages(p) {
    for (var i = 0; i < STAGES.length; i++) {
      var stage = STAGES[i];
      var span = stage.range[1] - stage.range[0];
      var fade = span * STAGE_FADE;
      var into = mapRange(p, stage.range[0], stage.range[0] + fade);
      var away = 1 - mapRange(p, stage.range[1] - fade, stage.range[1]);
      var opacity = Math.min(into, away);
      gsap.set(stageEls[stage.key], { opacity: opacity, y: (1 - into) * 8 });
    }
  }

  function updateCopy(p) {
    reveal(chapter, PHASES.chapterIn, PHASES.chapterOut, p, 8);
    revealMaskedLines(headlineLines, PHASES.headlineIn, PHASES.introOut, p, 0.2);
    reveal(support, PHASES.supportIn, PHASES.introOut, p, 12);

    updateStages(p);

    reveal(crack, PHASES.crackIn, PHASES.crackOut, p, 0);
    revealMaskedLines([crackLine], PHASES.crackIn, PHASES.crackOut, p, 0);

    reveal(material, PHASES.materialIn, PHASES.materialOut, p, 10);
    reveal(closing, PHASES.closingIn, null, p, 10);
  }

  // The Collection chapter's first video must already be buffering by the
  // time this chapter hands off, or the seam stalls on a poster frame.
  var nextHandoff = document.querySelector('.collection-media__video[data-cvideo="a"]');
  var nextWarmed = false;

  function warmNextChapter() {
    if (nextWarmed || !nextHandoff) return;
    nextWarmed = true;
    nextHandoff.preload = 'auto';
    nextHandoff.load();
  }

  function updateRoast(p) {
    updateMedia(p);
    updateCopy(p);
    if (p > PHASES.warmNextChapterAt) warmNextChapter();
    if (p > PHASES.warmB) warmVideo(videos.b);
    if (p > PHASES.warmC) warmVideo(videos.c);
    if (p > PHASES.warmD) warmVideo(videos.d);
    if (p > PHASES.warmE) warmVideo(videos.e);
  }

  section.classList.add('roast--cinematic');

  // transformation.js warms video A as its chapter closes; this is the
  // safety net for anyone arriving with that chapter already behind them.
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
    pin: section.querySelector('.roast-stage'),
    scrub: 1,
    onUpdate: function (self) { updateRoast(self.progress); },
    // Drop below Collection exactly when it takes over the viewport.
    onLeave: function () { section.classList.add('roast--handed-off'); },
    onEnterBack: function () { section.classList.remove('roast--handed-off'); }
  });

  // Layer opacity is otherwise only recomputed on scroll, so a video that
  // finishes buffering while the visitor sits still would leave the stale
  // fallback on screen until they moved again.
  ['a', 'b', 'c', 'd', 'e'].forEach(function (key) {
    videos[key].el.addEventListener('loadedmetadata', function () {
      updateRoast(pinTrigger.progress);
    });
  });

  updateRoast(0);
})();
