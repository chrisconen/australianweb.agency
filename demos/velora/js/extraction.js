/**
 * VELORA — Chapter 05, EXTRACTION (the ritual).
 *
 * Continues from the Signature Collection into the moment the product is
 * finally used: dose -> portafilter -> pre-infusion -> espresso streams ->
 * the finished cup. The chapter ends on that still; HOUSE continues from it.
 *
 * Progressive enhancement, same contract as the earlier chapters.
 */
(function () {
  'use strict';

  var section = document.getElementById('experience');
  if (!section) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reducedMotion || !hasGsap || typeof window.VELORA === 'undefined') return;

  var mapRange = VELORA.mapRange;
  var trackVideo = VELORA.trackVideo;
  var warmVideo = VELORA.warmVideo;

  var PHASES = {
    videoA: [0.00, 0.12],   // the collection commits to NOCTURNE -> the dose
    holdA:  [0.12, 0.20],   // EXTRACTION-01
    videoB: [0.20, 0.34],   // dose -> portafilter locked into the group head
    holdB:  [0.34, 0.41],   // EXTRACTION-02
    videoC: [0.41, 0.54],   // beneath the basket, pre-infusion begins
    holdC:  [0.54, 0.60],   // EXTRACTION-03
    videoD: [0.60, 0.77],   // the streams form — the liquid climax
    holdD:  [0.77, 0.84],   // EXTRACTION-04
    videoE: [0.84, 0.94],   // extraction finishes, camera resolves on crema
    holdE:  [0.94, 1.00],   // EXTRACTION-05 holds through the line and the pin

    fadeToB: [0.180, 0.225],
    fadeToC: [0.390, 0.435],
    fadeToD: [0.580, 0.625],
    fadeToE: [0.820, 0.865],

    chapterIn:  [0.095, 0.140],
    chapterOut: [0.900, 0.945],

    headlineIn: [0.135, 0.195],
    supportIn:  [0.160, 0.220],
    introOut:   [0.285, 0.350],

    // Stays on the cup. HOUSE inherits this exact frame — no bar cut here.
    finalIn:  [0.930, 0.955],
    finalOut: [0.970, 0.995],

    // HOUSE video A is the next camera move; prepare only that movement.
    warmNextChapterAt: 0.86
  };

  /**
   * One reading at a time, each tied to the beat it belongs to. First
   * contact and pressure share a beat, so PRE-INFUSION carries the 9 BAR
   * line rather than adding a fifth label.
   */
  var METRICS = [
    { key: 'dose', range: [0.300, 0.430] },       // through the lock-in
    { key: 'water', range: [0.470, 0.560] },      // approaching first contact
    { key: 'pressure', range: [0.560, 0.640] },   // the first droplets
    { key: 'time', range: [0.700, 0.830] }        // the streams
  ];

  /** Metric labels cross-fade over this fraction of their window. */
  var METRIC_FADE = 0.24;

  var frames = {};
  ['0', '1', '2', '3', '4', '5'].forEach(function (n) {
    frames[n] = section.querySelector('.extraction-frame[data-eframe="' + n + '"]');
  });

  var videoEls = {};
  var videos = {};
  ['a', 'b', 'c', 'd', 'e'].forEach(function (key) {
    videoEls[key] = section.querySelector('.extraction-media__video[data-evideo="' + key + '"]');
    videos[key] = trackVideo(videoEls[key]);
  });

  var chapter = section.querySelector('.extraction-chapter');
  var headlineLines = section.querySelectorAll('.extraction-headline .line-text');
  var support = section.querySelector('.extraction-support');
  var finalLines = section.querySelectorAll('.extraction-final .line-text');
  var metricEls = {};
  METRICS.forEach(function (m) {
    metricEls[m.key] = section.querySelector('.extraction-metric[data-metric="' + m.key + '"]');
  });

  var mediaLayers = [
    videoEls.a, videoEls.b, videoEls.c, videoEls.d, videoEls.e,
    frames['0'], frames['1'], frames['2'], frames['3'], frames['4'], frames['5']
  ];

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

  function updateMetrics(p) {
    for (var i = 0; i < METRICS.length; i++) {
      var m = METRICS[i];
      var span = m.range[1] - m.range[0];
      var fade = span * METRIC_FADE;
      var into = mapRange(p, m.range[0], m.range[0] + fade);
      var away = 1 - mapRange(p, m.range[1] - fade, m.range[1]);
      gsap.set(metricEls[m.key], { opacity: Math.min(into, away), y: (1 - into) * 8 });
    }
  }

  function updateCopy(p) {
    reveal(chapter, PHASES.chapterIn, PHASES.chapterOut, p, 8);
    revealMaskedLines(headlineLines, PHASES.headlineIn, PHASES.introOut, p, 0.2);
    reveal(support, PHASES.supportIn, PHASES.introOut, p, 12);
    updateMetrics(p);
    revealMaskedLines(finalLines, PHASES.finalIn, PHASES.finalOut, p, 0.3);
  }

  var nextHandoff = document.querySelector('.house-media__video[data-hvideo="a"]');
  var nextWarmed = false;

  function warmNextChapter() {
    if (nextWarmed || !nextHandoff) return;
    nextWarmed = true;
    nextHandoff.preload = 'auto';
    nextHandoff.load();
  }

  function updateExtraction(p) {
    updateMedia(p);
    updateCopy(p);
    if (p > PHASES.warmNextChapterAt) warmNextChapter();
    if (p > 0.03) warmVideo(videos.b);
    if (p > 0.22) warmVideo(videos.c);
    if (p > 0.42) warmVideo(videos.d);
    if (p > 0.62) warmVideo(videos.e);
  }

  section.classList.add('extraction--cinematic');

  // collection.js warms video A as its chapter closes; this is the safety net
  // for anyone arriving with that chapter already behind them.
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
    pin: section.querySelector('.extraction-stage'),
    scrub: 1,
    onUpdate: function (self) { updateExtraction(self.progress); },
    onLeave: function () { section.classList.add('extraction--handed-off'); },
    onEnterBack: function () { section.classList.remove('extraction--handed-off'); }
  });

  // Layer opacity is otherwise only recomputed on scroll, so a video that
  // finishes buffering while the visitor sits still would leave the stale
  // fallback on screen until they moved again.
  ['a', 'b', 'c', 'd', 'e'].forEach(function (key) {
    videos[key].el.addEventListener('loadedmetadata', function () {
      updateExtraction(pinTrigger.progress);
    });
  });

  updateExtraction(0);
})();
