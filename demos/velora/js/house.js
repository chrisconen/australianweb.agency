/**
 * VELORA — Chapter 06, VELORA HOUSE (Budapest).
 *
 * Continues the exact Extraction closing poster into the physical flagship:
 * cup -> bar -> full room -> roasting lab -> lounge -> human craft -> facade.
 * Six films carry the full spatial movement, with each endpoint still kept
 * ready as poster, reduced-motion content, and media-failure fallback.
 *
 * Progressive enhancement, following the same contract as every approved
 * chapter: no GSAP, reduced motion, or media failure leaves a complete
 * natural-scroll editorial sequence of HOUSE-01 through HOUSE-06.
 */
(function () {
  'use strict';

  var section = document.getElementById('house');
  if (!section) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reducedMotion || !hasGsap || typeof window.VELORA === 'undefined') return;

  var mapRange = VELORA.mapRange;
  var trackVideo = VELORA.trackVideo;
  var warmVideo = VELORA.warmVideo;

  var PHASES = {
    // A micro-bridge preserves the exact Extraction poster at the section
    // boundary before the first finished HOUSE film assumes the frame.
    opening:      [0.000, 0.006],
    openingBlend: [0.003, 0.012],

    videoA: [0.006, 0.120],  // cup -> complete monolithic bar
    holdA:  [0.120, 0.200],
    videoB: [0.200, 0.360],  // bar -> complete flagship room
    holdB:  [0.360, 0.440],
    videoC: [0.440, 0.580],  // room -> roasting lab behind glass
    holdC:  [0.580, 0.650],
    videoD: [0.650, 0.780],  // lab -> intimate lounge
    holdD:  [0.780, 0.840],
    videoE: [0.840, 0.920],  // lounge -> barista and cup
    holdE:  [0.920, 0.960],
    videoF: [0.960, 0.992],  // human craft -> exterior flagship identity

    // Endpoint overlaps are intentionally brief. These are one spatial film,
    // so a quiet dissolve hides codec/generation seams without a black beat.
    fadeToB: [0.196, 0.204],
    fadeToC: [0.436, 0.444],
    fadeToD: [0.646, 0.654],
    fadeToE: [0.836, 0.844],
    fadeToF: [0.956, 0.964],

    chapterIn:  [0.088, 0.120],
    chapterOut: [0.345, 0.385],
    headlineIn: [0.120, 0.165],
    supportIn:  [0.148, 0.188],
    introOut:   [0.305, 0.355],

    roomIn:  [0.360, 0.392],
    roomOut: [0.424, 0.452],

    labIn:  [0.468, 0.515],
    // Leave the tight lab hold image-led; the line belongs to the approach.
    labOut: [0.555, 0.595],

    loungeIn:  [0.770, 0.802],
    loungeOut: [0.824, 0.852],

    craftIn:  [0.858, 0.900],
    craftOut: [0.946, 0.970],

    finalIdentityIn: [0.974, 0.989],
    finalCityIn:     [0.980, 0.994],
    finalCtaIn:      [0.987, 0.998],

    // One movement is prepared at a time, before it owns the viewport.
    warmB: 0.04,
    warmC: 0.24,
    warmD: 0.48,
    warmE: 0.70,
    warmF: 0.84,
    warmNextChapterAt: 0.78
  };

  var frames = {};
  ['0', '1', '2', '3', '4', '5', '6'].forEach(function (n) {
    frames[n] = section.querySelector('.house-frame[data-hframe="' + n + '"]');
  });

  var videoEls = {};
  var videos = {};
  ['a', 'b', 'c', 'd', 'e', 'f'].forEach(function (key) {
    videoEls[key] = section.querySelector('.house-media__video[data-hvideo="' + key + '"]');
    videos[key] = trackVideo(videoEls[key]);
  });

  var chapter = section.querySelector('.house-chapter');
  var headlineLines = section.querySelectorAll('.house-headline .line-text');
  var support = section.querySelector('.house-support');
  var room = section.querySelector('.house-room');
  var labLines = section.querySelectorAll('.house-lab .line-text');
  var lounge = section.querySelector('.house-lounge');
  var craftLines = section.querySelectorAll('.house-craft .line-text');
  var finalIdentity = section.querySelector('.house-final__identity');
  var finalCity = section.querySelector('.house-final__city');
  var finalCta = section.querySelector('.house-final__cta');

  function enterHouseTone() {
    document.documentElement.classList.add('house-tone');
  }

  function leaveHouseTone() {
    document.documentElement.classList.remove('house-tone');
  }

  function enterHouse() {
    enterHouseTone();
    warmVideo(videos.a);
  }

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

  function updateCopy(p) {
    reveal(chapter, PHASES.chapterIn, PHASES.chapterOut, p, 8);
    revealMaskedLines(headlineLines, PHASES.headlineIn, PHASES.introOut, p, 0.16);
    reveal(support, PHASES.supportIn, PHASES.introOut, p, 10);

    reveal(room, PHASES.roomIn, PHASES.roomOut, p, 8);
    revealMaskedLines(labLines, PHASES.labIn, PHASES.labOut, p, 0.2);
    reveal(lounge, PHASES.loungeIn, PHASES.loungeOut, p, 8);
    revealMaskedLines(craftLines, PHASES.craftIn, PHASES.craftOut, p, 0);

    reveal(finalIdentity, PHASES.finalIdentityIn, null, p, 12);
    reveal(finalCity, PHASES.finalCityIn, null, p, 8);
    reveal(finalCta, PHASES.finalCtaIn, null, p, 8);

    // Keep the invisible CTA out of the hit-test and tab order until the
    // flagship identity is actually on screen.
    if (finalCta) {
      var ctaLive = mapRange(p, PHASES.finalCtaIn[0], PHASES.finalCtaIn[1]) > 0.35;
      finalCta.classList.toggle('is-live', ctaLive);
      if (ctaLive) finalCta.removeAttribute('tabindex');
      else finalCta.setAttribute('tabindex', '-1');
    }
  }

  var nextHandoff = document.querySelector('.shop-media__video[data-svideo="a"]');
  var nextWarmed = false;

  function warmNextChapter() {
    if (nextWarmed || !nextHandoff) return;
    nextWarmed = true;
    nextHandoff.preload = 'auto';
    nextHandoff.load();
  }

  function updateHouse(p) {
    updateMedia(p);
    updateCopy(p);
    // A restored scroll position can skip the one-shot approach trigger.
    if (p > 0) warmVideo(videos.a);
    if (p > PHASES.warmB) warmVideo(videos.b);
    if (p > PHASES.warmC) warmVideo(videos.c);
    if (p > PHASES.warmD) warmVideo(videos.d);
    if (p > PHASES.warmE) warmVideo(videos.e);
    if (p > PHASES.warmF) warmVideo(videos.f);
    if (p > PHASES.warmNextChapterAt) warmNextChapter();
  }

  section.classList.add('house--cinematic');
  if (finalCta) finalCta.setAttribute('tabindex', '-1');

  // extraction.js normally warms A before its pin releases. This trigger is
  // the deep-link/restored-scroll safety net when Extraction was never read.
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
    pin: section.querySelector('.house-stage'),
    scrub: 1,
    onUpdate: function (self) { updateHouse(self.progress); },
    onEnter: enterHouse,
    onEnterBack: function () {
      section.classList.remove('house--handed-off');
      enterHouse();
    },
    // THE SHOP continues from HOUSE-06. Keep ivory until SHOP takes --ink.
    // Handing off drops this chapter under SHOP so the shared frame never slides.
    onLeave: function () {
      enterHouseTone();
      section.classList.add('house--handed-off');
    },
    onLeaveBack: leaveHouseTone
  });

  // A late metadata arrival should replace its poster immediately even when
  // the visitor has stopped scrolling at the seam.
  ['a', 'b', 'c', 'd', 'e', 'f'].forEach(function (key) {
    videos[key].el.addEventListener('loadedmetadata', function () {
      updateHouse(pinTrigger.progress);
    });
  });

  updateHouse(0);
})();
