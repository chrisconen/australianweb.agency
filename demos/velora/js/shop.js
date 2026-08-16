/**
 * VELORA — Chapter 07, THE SHOP.
 *
 * Continues the exact HOUSE-06 flagship poster into the retail alcove,
 * then coffee, ceramics, the Ritual Brewer, the Home Ritual box, and the
 * complete at-home universe. Six films carry the spatial movement; each
 * endpoint still is the poster, reduced-motion content, and failure fallback.
 *
 * Same contract as every approved chapter: no GSAP, reduced motion, or
 * media failure leaves a complete natural-scroll editorial sequence.
 */
(function () {
  'use strict';

  var section = document.getElementById('shop');
  if (!section) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reducedMotion || !hasGsap || typeof window.VELORA === 'undefined') return;

  var mapRange = VELORA.mapRange;
  var trackVideo = VELORA.trackVideo;
  var warmVideo = VELORA.warmVideo;

  var PHASES = {
    opening:      [0.000, 0.006],
    openingBlend: [0.003, 0.012],

    videoA: [0.006, 0.140],
    holdA:  [0.140, 0.220],
    videoB: [0.220, 0.370],
    holdB:  [0.370, 0.440],
    videoC: [0.440, 0.580],
    holdC:  [0.580, 0.640],
    videoD: [0.640, 0.770],
    holdD:  [0.770, 0.830],
    videoE: [0.830, 0.920],
    holdE:  [0.920, 0.960],
    videoF: [0.960, 1.000],

    fadeToB: [0.216, 0.224],
    fadeToC: [0.436, 0.444],
    fadeToD: [0.636, 0.644],
    fadeToE: [0.826, 0.834],
    fadeToF: [0.956, 0.964],

    chapterIn:  [0.100, 0.140],
    chapterOut: [0.205, 0.235],
    headlineIn: [0.140, 0.185],
    supportIn:  [0.162, 0.205],
    introOut:   [0.205, 0.235],

    coffeeIn:  [0.345, 0.385],
    coffeeOut: [0.425, 0.455],

    ceramicsIn:  [0.555, 0.590],
    ceramicsOut: [0.625, 0.655],

    brewingIn:  [0.745, 0.780],
    brewingOut: [0.815, 0.845],

    ritualIn:  [0.900, 0.930],
    ritualOut: [0.948, 0.968],

    finalHeadlineIn: [0.972, 0.988],
    finalLineIn:     [0.978, 0.992],
    finalCtaIn:      [0.986, 0.998],

    warmB: 0.06,
    warmC: 0.26,
    warmD: 0.48,
    warmE: 0.68,
    warmF: 0.84
  };

  // 0 = dark/ivory ink, 1 = bright/obsidian ink.
  // SHOP-02 and SHOP-03 are the lit stone sets; brewing returns to the
  // dark-wood left field, so ivory is readable again from VIDEO D on.
  var TONE_RAMPS = [
    { range: [0.220, 0.355], to: 1 },
    { range: [0.640, 0.755], to: 0 }
  ];

  var INK_DARK_WORLD = [238, 234, 226];
  var INK_LIGHT_WORLD = [8, 8, 8];

  var frames = {};
  ['0', '1', '2', '3', '4', '5', '6'].forEach(function (n) {
    frames[n] = section.querySelector('.shop-frame[data-sframe="' + n + '"]');
  });

  var videoEls = {};
  var videos = {};
  ['a', 'b', 'c', 'd', 'e', 'f'].forEach(function (key) {
    videoEls[key] = section.querySelector('.shop-media__video[data-svideo="' + key + '"]');
    videos[key] = trackVideo(videoEls[key]);
  });

  var chapter = section.querySelector('.shop-chapter');
  var headlineLines = section.querySelectorAll('.shop-headline .line-text');
  var support = section.querySelector('.shop-support');
  var coffee = section.querySelector('.shop-category[data-cat="coffee"]');
  var ceramics = section.querySelector('.shop-category[data-cat="ceramics"]');
  var brewing = section.querySelector('.shop-category[data-cat="brewing"]');
  var ritual = section.querySelector('.shop-category[data-cat="ritual"]');
  var finalHeadlineLines = section.querySelectorAll('.shop-final__headline .line-text');
  var finalLine = section.querySelector('.shop-final__line');
  var finalCta = section.querySelector('.shop-final__cta');
  var liveCtas = section.querySelectorAll('.shop-category__cta, .shop-final__cta');
  var scrim = section.querySelector('.shop-scrim');
  var contrast = section.querySelector('.shop-contrast');
  var veil = section.querySelector('.shop-veil');

  var mediaLayers = [
    videoEls.a, videoEls.b, videoEls.c, videoEls.d, videoEls.e, videoEls.f,
    frames['0'], frames['1'], frames['2'], frames['3'], frames['4'], frames['5'], frames['6']
  ];

  var updateMedia = VELORA.createMediaSequence({
    segments: [
      { state: null, from: frames['0'], to: frames['0'], range: PHASES.opening },
      { state: videos.a, from: frames['0'], to: frames['1'], range: PHASES.videoA },
      { state: videos.b, from: frames['1'], to: frames['2'], range: PHASES.videoB },
      { state: videos.c, from: frames['2'], to: frames['3'], range: PHASES.videoC },
      { state: videos.d, from: frames['3'], to: frames['4'], range: PHASES.videoD },
      { state: videos.e, from: frames['4'], to: frames['5'], range: PHASES.videoE },
      { state: videos.f, from: frames['5'], to: frames['6'], range: PHASES.videoF }
    ],
    seams: [
      PHASES.openingBlend,
      PHASES.fadeToB,
      PHASES.fadeToC,
      PHASES.fadeToD,
      PHASES.fadeToE,
      PHASES.fadeToF
    ],
    style: 'dissolve',
    layers: mediaLayers
  });

  function reveal(el, inRange, outRange, p, shiftPx) {
    if (!el) return;
    var into = mapRange(p, inRange[0], inRange[1]);
    var away = outRange ? 1 - mapRange(p, outRange[0], outRange[1]) : 1;
    gsap.set(el, {
      opacity: Math.min(into, away),
      y: (1 - into) * (shiftPx === undefined ? 12 : shiftPx)
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

  var writeInk = VELORA.createInkWriter(section);

  function applyTone(p) {
    var tone = toneAt(p);
    var ink = inkAt(tone);
    if (scrim) gsap.set(scrim, { opacity: tone });
    if (contrast) gsap.set(contrast, { opacity: 1 - tone });
    if (veil) gsap.set(veil, { opacity: tone });
    writeInk(ink);
  }

  function clearTone() {
    writeInk.clear();
  }

  function setCtaLive(el, live) {
    if (!el) return;
    el.classList.toggle('is-live', live);
    if (live) el.removeAttribute('tabindex');
    else el.setAttribute('tabindex', '-1');
  }

  function updateCopy(p) {
    reveal(chapter, PHASES.chapterIn, PHASES.chapterOut, p, 8);
    revealMaskedLines(headlineLines, PHASES.headlineIn, PHASES.introOut, p, 0);
    reveal(support, PHASES.supportIn, PHASES.introOut, p, 10);

    reveal(coffee, PHASES.coffeeIn, PHASES.coffeeOut, p, 10);
    reveal(ceramics, PHASES.ceramicsIn, PHASES.ceramicsOut, p, 10);
    reveal(brewing, PHASES.brewingIn, PHASES.brewingOut, p, 10);
    reveal(ritual, PHASES.ritualIn, PHASES.ritualOut, p, 10);

    revealMaskedLines(finalHeadlineLines, PHASES.finalHeadlineIn, null, p, 0);
    reveal(finalLine, PHASES.finalLineIn, null, p, 8);
    reveal(finalCta, PHASES.finalCtaIn, null, p, 8);

    setCtaLive(
      section.querySelector('.shop-category[data-cat="coffee"] .shop-category__cta'),
      mapRange(p, PHASES.coffeeIn[0], PHASES.coffeeIn[1]) > 0.35 &&
        mapRange(p, PHASES.coffeeOut[0], PHASES.coffeeOut[1]) < 0.65
    );
    setCtaLive(
      section.querySelector('.shop-category[data-cat="ceramics"] .shop-category__cta'),
      mapRange(p, PHASES.ceramicsIn[0], PHASES.ceramicsIn[1]) > 0.35 &&
        mapRange(p, PHASES.ceramicsOut[0], PHASES.ceramicsOut[1]) < 0.65
    );
    setCtaLive(finalCta, mapRange(p, PHASES.finalCtaIn[0], PHASES.finalCtaIn[1]) > 0.35);
  }

  function enterShop() {
    document.documentElement.classList.remove('house-tone');
    section.classList.add('shop--raised');
    warmVideo(videos.a);
  }

  function leaveShop() {
    clearTone();
    section.classList.remove('shop--raised');
  }

  function updateShop(p) {
    updateMedia(p);
    updateCopy(p);
    applyTone(p);
    if (p > 0) warmVideo(videos.a);
    if (p > PHASES.warmB) warmVideo(videos.b);
    if (p > PHASES.warmC) warmVideo(videos.c);
    if (p > PHASES.warmD) warmVideo(videos.d);
    if (p > PHASES.warmE) warmVideo(videos.e);
    if (p > PHASES.warmF) warmVideo(videos.f);
  }

  section.classList.add('shop--cinematic');
  for (var i = 0; i < liveCtas.length; i++) {
    liveCtas[i].setAttribute('tabindex', '-1');
  }

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
    pin: section.querySelector('.shop-stage'),
    scrub: 1,
    onUpdate: function (self) { updateShop(self.progress); },
    onEnter: enterShop,
    onEnterBack: enterShop,
    onLeave: function () {
      clearTone();
      section.classList.add('shop--handed-off');
    },
    onLeaveBack: leaveShop
  });

  ['a', 'b', 'c', 'd', 'e', 'f'].forEach(function (key) {
    videos[key].el.addEventListener('loadedmetadata', function () {
      updateShop(pinTrigger.progress);
    });
  });

  updateShop(0);
})();
