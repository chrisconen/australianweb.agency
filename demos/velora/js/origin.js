/**
 * VELORA — Chapter 01, ORIGIN.
 *
 * Continues the hero's camera into real terrain: bean canyon -> Ethiopian
 * ravine -> highland landscape -> a single coffee cherry.
 *
 * Progressive enhancement, same contract as the hero: the markup + CSS
 * already render a readable stacked chapter (three stills + all copy) with
 * no JS. This upgrades that into the pinned, scroll-scrubbed sequence.
 * Reduced motion or a missing GSAP/VELORA leaves the static version alone.
 */
(function () {
  'use strict';

  var section = document.getElementById('origin');
  if (!section) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reducedMotion || !hasGsap || typeof window.VELORA === 'undefined') return;

  var mapRange = VELORA.mapRange;
  var trackVideo = VELORA.trackVideo;
  var scrubVideo = VELORA.scrubVideo;
  var warmVideo = VELORA.warmVideo;

  /**
   * Scroll-progress phases (fractions of the chapter's total scroll).
   *
   * The three source videos do not join on identical frames — measured
   * ~16-19dB PSNR across each seam — so each handoff crossfades during a
   * hold, where the camera is static and a dissolve reads as atmosphere
   * rather than as a cut. Video N always scrubs its full 0..1 range.
   */
  var PHASES = {
    videoA: [0.00, 0.28],   // bean canyon -> Ethiopian ravine
    holdA:  [0.28, 0.38],   // arrive ORIGIN-01
    videoB: [0.38, 0.64],   // ravine -> highland landscape
    holdB:  [0.64, 0.72],   // arrive ORIGIN-02, main storytelling beat
    videoC: [0.72, 0.92],   // landscape -> coffee cherry
    // 0.92 -> 1 holds ORIGIN-03

    // Seams: crossfade windows sitting inside the preceding hold.
    fadeToB: [0.345, 0.38],
    fadeToC: [0.685, 0.72],

    chapterIn:   [0.20, 0.27],
    chapterOut:  [0.93, 0.985],
    ethiopiaIn:  [0.285, 0.35],
    yirgaIn:     [0.310, 0.375],
    statementIn: [0.330, 0.395],
    placeOut:    [0.430, 0.510],
    altitudeIn:  [0.520, 0.680],
    altitudeOut: [0.740, 0.820],
    supportIn:   [0.660, 0.720],
    metaIn:      [0.665, 0.725],
    detailOut:   [0.750, 0.825],

    // Lazily buffer each video shortly before it is needed.
    warmB: 0.12,
    warmC: 0.45,

    // Start buffering the Transformation handoff video before this chapter ends.
    warmNextChapterAt: 0.6
  };

  // Each movement's start and end still. The start of one is the end of the
  // previous, so the chapter opens on the hero's closing frame.
  var frames = {
    open: section.querySelector('.origin-frame[data-oframe="0"]'),
    a: section.querySelector('.origin-frame[data-oframe="1"]'),
    b: section.querySelector('.origin-frame[data-oframe="2"]'),
    c: section.querySelector('.origin-frame[data-oframe="3"]')
  };

  var videoEls = {
    a: section.querySelector('.origin-media__video[data-ovideo="a"]'),
    b: section.querySelector('.origin-media__video[data-ovideo="b"]'),
    c: section.querySelector('.origin-media__video[data-ovideo="c"]')
  };

  var videos = {
    a: trackVideo(videoEls.a),
    b: trackVideo(videoEls.b),
    c: trackVideo(videoEls.c)
  };

  var chapter = section.querySelector('.origin-chapter');
  var ethiopia = section.querySelector('.origin-place__primary .line-text');
  var yirgacheffe = section.querySelector('.origin-place__secondary');
  var statement = section.querySelector('.origin-statement');
  var altitude = section.querySelector('.origin-altitude');
  var support = section.querySelector('.origin-support');
  var meta = section.querySelector('.origin-meta');

  /**
   * A video is only abandoned on a hard decode/network error, or when the
   * metadata deadline passed and the element is still empty. Anything that
   * has metadata is usable no matter what the deadline concluded earlier —
   * these videos start at preload="none", so the deadline routinely expires
   * before warming and must not latch.
   */
  function videoBroken(state) {
    return !!state.el.error || (state.failed && state.el.readyState < 1);
  }

  /**
   * Resolves one movement to layer weights. A merely-slow video keeps its own
   * layer — its poster is that movement's opening frame, so it reads correctly
   * while buffering. Only a broken video falls back to stills, and then the
   * pair is crossfaded by the movement's own progress so the chapter still
   * travels start -> end rather than snapping to the destination.
   */
  function movement(state, fromStill, toStill, localT, weight, out) {
    if (videoBroken(state)) {
      out.stills.push([fromStill, weight * (1 - localT)]);
      out.stills.push([toStill, weight * localT]);
      return;
    }
    scrubVideo(state, localT);
    out.videos.push([state.el, weight]);
  }

  function updateMedia(p) {
    var out = { videos: [], stills: [] };

    // Later movements crossfade in over the tail of the preceding hold.
    var toB = mapRange(p, PHASES.fadeToB[0], PHASES.fadeToB[1]);
    var toC = mapRange(p, PHASES.fadeToC[0], PHASES.fadeToC[1]);

    var aWeight = 1 - toB;
    var bWeight = toB * (1 - toC);
    var cWeight = toC;

    if (aWeight > 0) {
      movement(videos.a, frames.open, frames.a, mapRange(p, PHASES.videoA[0], PHASES.videoA[1]), aWeight, out);
    }
    if (bWeight > 0) {
      movement(videos.b, frames.a, frames.b, mapRange(p, PHASES.videoB[0], PHASES.videoB[1]), bWeight, out);
    }
    if (cWeight > 0) {
      movement(videos.c, frames.b, frames.c, mapRange(p, PHASES.videoC[0], PHASES.videoC[1]), cWeight, out);
    }

    applyLayers(out);
  }

  var mediaLayers = [videoEls.a, videoEls.b, videoEls.c, frames.open, frames.a, frames.b, frames.c];

  function applyLayers(out) {
    var wanted = new Map();
    var i;

    // Accumulate: one still can be both the outgoing movement's end frame and
    // the incoming movement's start frame during a seam crossfade.
    function add(pair) {
      wanted.set(pair[0], (wanted.get(pair[0]) || 0) + pair[1]);
    }
    for (i = 0; i < out.videos.length; i++) add(out.videos[i]);
    for (i = 0; i < out.stills.length; i++) add(out.stills[i]);

    for (i = 0; i < mediaLayers.length; i++) {
      gsap.set(mediaLayers[i], { opacity: VELORA.clamp01(wanted.get(mediaLayers[i]) || 0) });
    }
  }

  function reveal(el, inRange, outRange, p, shiftPx) {
    var into = mapRange(p, inRange[0], inRange[1]);
    var away = outRange ? 1 - mapRange(p, outRange[0], outRange[1]) : 1;
    gsap.set(el, {
      opacity: Math.min(into, away),
      y: (1 - into) * (shiftPx === undefined ? 14 : shiftPx)
    });
  }

  function updateCopy(p) {
    reveal(chapter, PHASES.chapterIn, PHASES.chapterOut, p, 8);

    // Masked vertical reveal for the display-type location name.
    var ethiopiaIn = mapRange(p, PHASES.ethiopiaIn[0], PHASES.ethiopiaIn[1]);
    var placeAway = 1 - mapRange(p, PHASES.placeOut[0], PHASES.placeOut[1]);
    gsap.set(ethiopia, {
      opacity: Math.min(ethiopiaIn, placeAway),
      y: ((1 - ethiopiaIn) * 100) + '%'
    });

    reveal(yirgacheffe, PHASES.yirgaIn, PHASES.placeOut, p, 12);
    reveal(statement, PHASES.statementIn, PHASES.placeOut, p, 12);

    // The altitude drifts a little further than the rest — restrained, but
    // enough that it feels anchored in the landscape rather than pasted on.
    reveal(altitude, PHASES.altitudeIn, PHASES.altitudeOut, p, 20);

    reveal(support, PHASES.supportIn, PHASES.detailOut, p, 12);
    reveal(meta, PHASES.metaIn, PHASES.detailOut, p, 10);
  }

  // The Transformation chapter's first video must already be buffering by the
  // time this chapter hands off, or the seam stalls on a poster frame.
  var nextHandoff = document.querySelector('.transformation-media__video[data-tvideo="a"]');
  var nextWarmed = false;

  function warmNextChapter() {
    if (nextWarmed || !nextHandoff) return;
    nextWarmed = true;
    nextHandoff.preload = 'auto';
    nextHandoff.load();
  }

  function updateOrigin(p) {
    updateMedia(p);
    updateCopy(p);
    if (p > PHASES.warmB) warmVideo(videos.b);
    if (p > PHASES.warmC) warmVideo(videos.c);
    if (p > PHASES.warmNextChapterAt) warmNextChapter();
  }

  section.classList.add('origin--cinematic');

  // hero.js warms video A mid-hero, which covers the normal top-down read.
  // This is the safety net for anyone who arrives with the hero already
  // behind them (deep link, restored scroll position, back navigation).
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
    pin: section.querySelector('.origin-stage'),
    scrub: 1,
    onUpdate: function (self) { updateOrigin(self.progress); },
    // Drop below Transformation exactly when it takes over the viewport, and
    // take the layer back when scrolling returns into this chapter.
    onLeave: function () { section.classList.add('origin--handed-off'); },
    onEnterBack: function () { section.classList.remove('origin--handed-off'); }
  });

  // Layer opacity is otherwise only recomputed on scroll. A video that
  // finishes buffering while the visitor sits still would leave the stale
  // fallback on screen until they moved again, so re-render on arrival.
  ['a', 'b', 'c'].forEach(function (key) {
    videos[key].el.addEventListener('loadedmetadata', function () {
      updateOrigin(pinTrigger.progress);
    });
  });

  updateOrigin(0);
})();
