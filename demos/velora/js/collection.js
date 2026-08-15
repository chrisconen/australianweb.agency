/**
 * VELORA — Chapter 04, SIGNATURE COLLECTION.
 *
 * Continues from the Roast atelier into the three canonical packages:
 * Nº01 LUMEN, Nº02 TERRA, Nº03 NOCTURNE, resolving into the campaign
 * composition that shows all three together.
 *
 * This is the first chapter whose worlds are not uniformly dark — LUMEN and
 * TERRA are bright travertine sets — so it also drives a document-level
 * tone so text and header stay legible.
 *
 * Progressive enhancement, same contract as the earlier chapters.
 */
(function () {
  'use strict';

  var section = document.getElementById('signature-collection');
  if (!section) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reducedMotion || !hasGsap || typeof window.VELORA === 'undefined') return;

  var mapRange = VELORA.mapRange;
  var trackVideo = VELORA.trackVideo;
  var warmVideo = VELORA.warmVideo;

  var PHASES = {
    videoA: [0.00, 0.13],   // atelier -> the first finished package
    holdA:  [0.13, 0.21],   // COLLECTION-01
    videoB: [0.21, 0.37],   // dark atelier -> bright LUMEN world
    holdB:  [0.37, 0.43],   // COLLECTION-02, LUMEN
    videoC: [0.43, 0.59],   // LUMEN -> TERRA
    holdC:  [0.59, 0.65],   // COLLECTION-03, TERRA
    videoD: [0.65, 0.81],   // TERRA -> NOCTURNE
    holdD:  [0.81, 0.87],   // COLLECTION-04, NOCTURNE
    videoE: [0.87, 1.00],   // pull back to the full collection

    fadeToB: [0.190, 0.240],
    fadeToC: [0.410, 0.460],
    fadeToD: [0.630, 0.680],
    fadeToE: [0.850, 0.900],

    chapterIn:  [0.100, 0.145],
    chapterOut: [0.930, 0.970],

    headlineIn: [0.140, 0.200],
    supportIn:  [0.165, 0.225],
    introOut:   [0.240, 0.310],

    lumenIn:     [0.345, 0.395],
    lumenOut:    [0.455, 0.520],
    terraIn:     [0.575, 0.620],
    terraOut:    [0.675, 0.740],
    nocturneIn:  [0.795, 0.840],
    nocturneOut: [0.885, 0.925],

    finalIn: [0.940, 0.985],

    warmB: 0.04,
    warmC: 0.26,
    warmD: 0.48,
    warmE: 0.70,

    // Start buffering the Extraction handoff video before this chapter ends.
    warmNextChapterAt: 0.72
  };

  /**
   * Tone as a 0..1 ramp (0 = dark world, 1 = bright world), taken from the
   * mean luminance of each state (55, 137, 111, 8, 117 of 255). Each ramp
   * sits inside the movement that actually performs the change, so the
   * editorial ink turns while the image is already on its way.
   *
   * This is scroll-linked rather than a CSS transition on purpose:
   * ScrollTrigger rewrites the pinned stage's inline styles every frame,
   * which restarts a time-based transition before it can ever arrive.
   */
  var TONE_RAMPS = [
    { range: [0.255, 0.330], to: 1 },   // LUMEN world arrives
    { range: [0.700, 0.775], to: 0 },   // NOCTURNE takes the light away
    { range: [0.895, 0.955], to: 1 }    // the full collection resolves bright
  ];

  var INK_DARK_WORLD = [238, 234, 226];   // ivory
  var INK_LIGHT_WORLD = [8, 8, 8];        // obsidian

  var frames = {};
  ['0', '1', '2', '3', '4', '5'].forEach(function (n) {
    frames[n] = section.querySelector('.collection-frame[data-cframe="' + n + '"]');
  });

  var videoEls = {};
  var videos = {};
  ['a', 'b', 'c', 'd', 'e'].forEach(function (key) {
    videoEls[key] = section.querySelector('.collection-media__video[data-cvideo="' + key + '"]');
    videos[key] = trackVideo(videoEls[key]);
  });

  var chapter = section.querySelector('.collection-chapter');
  var headlineLines = section.querySelectorAll('.collection-headline .line-text');
  var support = section.querySelector('.collection-support');
  var products = {
    lumen: section.querySelector('.collection-product[data-product="lumen"]'),
    terra: section.querySelector('.collection-product[data-product="terra"]'),
    nocturne: section.querySelector('.collection-product[data-product="nocturne"]')
  };
  var finalBlock = section.querySelector('.collection-final');
  var scrim = section.querySelector('.collection-scrim');
  var contrast = section.querySelector('.collection-contrast');
  var veil = section.querySelector('.collection-veil');

  var mediaLayers = [
    videoEls.a, videoEls.b, videoEls.c, videoEls.d, videoEls.e,
    frames['0'], frames['1'], frames['2'], frames['3'], frames['4'], frames['5']
  ];

  /**
   * Seams pass through the stage background rather than blending the two
   * shots — LUMEN and TERRA share a camera setup, so a cross-dissolve would
   * ghost one package over the other. The stage background follows the tone,
   * so a seam between bright worlds dips through porcelain rather than
   * black, and the dark seams still dip through obsidian.
   */
  var updateMedia = VELORA.createMediaSequence({
    segments: [
      { state: videos.a, from: frames['0'], to: frames['1'], range: PHASES.videoA },
      { state: videos.b, from: frames['1'], to: frames['2'], range: PHASES.videoB },
      { state: videos.c, from: frames['2'], to: frames['3'], range: PHASES.videoC },
      { state: videos.d, from: frames['3'], to: frames['4'], range: PHASES.videoD },
      { state: videos.e, from: frames['4'], to: frames['5'], range: PHASES.videoE }
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

  function toneAt(p) {
    var tone = 0;
    for (var i = 0; i < TONE_RAMPS.length; i++) {
      var ramp = TONE_RAMPS[i];
      var t = mapRange(p, ramp.range[0], ramp.range[1]);
      if (t > 0) tone = tone + (ramp.to - tone) * t;
    }
    return tone;
  }

  function inkAt(tone) {
    var c = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      c[i] = Math.round(INK_DARK_WORLD[i] + (INK_LIGHT_WORLD[i] - INK_DARK_WORLD[i]) * tone);
    }
    return c;
  }

  /**
   * One tone value drives everything the brightness affects: the porcelain
   * plate the seams dip through, the contrast wash that would dirty a bright
   * set, and the ink (on :root, so the global header adapts with the copy).
   */
  function applyTone(p) {
    var tone = toneAt(p);
    var ink = inkAt(tone);
    gsap.set(scrim, { opacity: tone });
    gsap.set(contrast, { opacity: 1 - tone });
    gsap.set(veil, { opacity: tone });
    document.documentElement.style.setProperty('--ink', 'rgb(' + ink.join(',') + ')');
    document.documentElement.style.setProperty(
      '--ink-rule', 'rgba(' + ink.join(',') + ',0.4)'
    );
  }

  /** The rest of the site is ivory-on-obsidian; never leak this chapter's ink. */
  function clearTone() {
    document.documentElement.style.removeProperty('--ink');
    document.documentElement.style.removeProperty('--ink-rule');
  }

  function updateCopy(p) {
    reveal(chapter, PHASES.chapterIn, PHASES.chapterOut, p, 8);
    revealMaskedLines(headlineLines, PHASES.headlineIn, PHASES.introOut, p, 0.22);
    reveal(support, PHASES.supportIn, PHASES.introOut, p, 12);

    reveal(products.lumen, PHASES.lumenIn, PHASES.lumenOut, p, 12);
    reveal(products.terra, PHASES.terraIn, PHASES.terraOut, p, 12);
    reveal(products.nocturne, PHASES.nocturneIn, PHASES.nocturneOut, p, 12);

    reveal(finalBlock, PHASES.finalIn, null, p, 12);
  }

  // The Extraction chapter's first video must already be buffering by the
  // time this chapter hands off, or the seam stalls on a poster frame.
  var nextHandoff = document.querySelector('.extraction-media__video[data-evideo="a"]');
  var nextWarmed = false;

  function warmNextChapter() {
    if (nextWarmed || !nextHandoff) return;
    nextWarmed = true;
    nextHandoff.preload = 'auto';
    nextHandoff.load();
  }

  function updateCollection(p) {
    updateMedia(p);
    updateCopy(p);
    applyTone(p);
    if (p > PHASES.warmNextChapterAt) warmNextChapter();
    if (p > PHASES.warmB) warmVideo(videos.b);
    if (p > PHASES.warmC) warmVideo(videos.c);
    if (p > PHASES.warmD) warmVideo(videos.d);
    if (p > PHASES.warmE) warmVideo(videos.e);
  }

  section.classList.add('collection--cinematic');

  // roast.js warms video A as its chapter closes; this is the safety net for
  // anyone arriving with that chapter already behind them.
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
    pin: section.querySelector('.collection-stage'),
    scrub: 1,
    onUpdate: function (self) { updateCollection(self.progress); },
    // The rest of the site is uniformly dark, so the tone must not leak past
    // this chapter in either scroll direction.
    onLeave: function () { clearTone(); section.classList.add('collection--handed-off'); },
    onLeaveBack: clearTone,
    onEnterBack: function () { section.classList.remove('collection--handed-off'); }
  });

  // Layer opacity is otherwise only recomputed on scroll, so a video that
  // finishes buffering while the visitor sits still would leave the stale
  // fallback on screen until they moved again.
  ['a', 'b', 'c', 'd', 'e'].forEach(function (key) {
    videos[key].el.addEventListener('loadedmetadata', function () {
      updateCollection(pinTrigger.progress);
    });
  });

  updateCollection(0);
})();
