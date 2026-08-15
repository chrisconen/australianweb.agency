/**
 * VELORA — shared cinematic scroll utilities.
 *
 * Extracted from the hero so every chapter scrubs video the same way.
 * Exposes window.VELORA. Must load before hero.js / origin.js.
 */
(function (global) {
  'use strict';

  // Deadline for a video to report metadata before a chapter falls back to
  // its still frames. Declared before any trackVideo() call — a `var` read
  // before its initialiser is undefined, which setTimeout coerces to 0 and
  // would fail every video instantly.
  var METADATA_TIMEOUT_MS = 8000;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /** Normalises v within [inMin, inMax] to 0..1, clamped at both ends. */
  function mapRange(v, inMin, inMax) {
    return clamp01((v - inMin) / (inMax - inMin));
  }

  function seekTo(state, target) {
    if (Math.abs(state.el.currentTime - target) < 0.01) return;
    state.el.currentTime = target;
  }

  /**
   * Wraps a <video> in the state this project needs for scroll scrubbing.
   * A video that never reports metadata (blocked, offline, stalled) is
   * treated like an explicit error so the caller can fall back to stills.
   * Recoverable — late metadata upgrades the chapter back to video.
   */
  function trackVideo(el) {
    var state = { el: el, ready: false, failed: false, pendingTime: null, warmed: false };

    var timeout = setTimeout(function () {
      if (!state.ready) state.failed = true;
    }, METADATA_TIMEOUT_MS);

    function markReady() {
      state.ready = true;
      state.failed = false;
      clearTimeout(timeout);
    }

    el.addEventListener('loadedmetadata', markReady);

    // preload="auto" starts fetching during HTML parse, so metadata can
    // already be in by the time a deferred script attaches the listener
    // above — that 'loadedmetadata' is then never observed. Check the live
    // readyState too, or the video is wrongly declared failed on fast loads.
    if (el.readyState >= 1 /* HAVE_METADATA */) markReady();

    el.addEventListener('error', function () {
      state.failed = true;
      clearTimeout(timeout);
    });

    // Seeks requested while one is still resolving are coalesced to the
    // newest target and applied on 'seeked'. Without this the frame stalls
    // wherever the last completed seek landed once scrolling stops.
    el.addEventListener('seeked', function () {
      if (state.pendingTime === null) return;
      var next = state.pendingTime;
      state.pendingTime = null;
      seekTo(state, next);
    });

    el.pause();
    return state;
  }

  /**
   * Begins buffering a video that was left at preload="none". Idempotent —
   * chapters call this from scroll handlers, so it must be cheap to repeat.
   */
  function warmVideo(state) {
    if (state.warmed) return;
    state.warmed = true;
    if (state.el.preload !== 'auto') state.el.preload = 'auto';
    state.el.load();
  }

  /**
   * Maps a 0..1 phase progress onto the video's timeline. No-ops until
   * metadata has loaded (the poster covers that gap). While a seek is in
   * flight the newest target is parked in pendingTime rather than dropped,
   * so the frame always catches up to where the scroll actually ended.
   */
  function scrubVideo(state, localT) {
    // Late metadata (preload=none until a chapter warms the file) must
    // recover even if the 8s deadline already marked the element failed.
    if (state.el.readyState >= 1 && state.el.duration) {
      state.ready = true;
      state.failed = false;
    }
    if (state.failed || !state.ready || !state.el.duration) return;
    // `currentTime === duration` is after the last decodable frame in
    // Chromium: the element falls back to metadata-only readiness and can
    // expose its poster at every hold. Stop 50ms short (or 1% for very short
    // clips) so the visual endpoint is the final real frame, never a void.
    var endPadding = Math.min(0.05, state.el.duration * 0.01);
    var decodableEnd = Math.max(0, state.el.duration - endPadding);
    var target = clamp01(localT) * decodableEnd;
    if (state.el.seeking) {
      state.pendingTime = target;
      return;
    }
    seekTo(state, target);
  }

  /**
   * Opacity pair [outgoing, incoming] for a seam, given its 0..1 progress.
   *
   * 'dissolve' keeps the two layers summing to 1 — right for shots that are
   * one continuous camera move, where the frames nearly match.
   *
   * 'through-dark' fades the outgoing shot out before the incoming one
   * starts, so they are never both visible. Two genuinely different shots
   * cross-dissolved produce a double exposure: both subjects are bright
   * against black, so dimming alone never removes the ghost — they have to
   * be separated in time. The exponent keeps the fully dark moment to a
   * blink (~5% of the window) rather than a visible black beat.
   */
  var SEAM_EASE = 0.6;

  function seamWeights(t, style) {
    var x = clamp01(t);
    if (style !== 'through-dark') return [1 - x, x];
    if (x < 0.5) return [Math.pow(1 - x / 0.5, SEAM_EASE), 0];
    return [0, Math.pow((x - 0.5) / 0.5, SEAM_EASE)];
  }

  /**
   * A video is only abandoned on a hard decode/network error, or when the
   * metadata deadline passed with the element still empty. Videos start at
   * preload="none", so that deadline routinely expires before warming and
   * must never latch once readyState catches up.
   */
  function videoBroken(state) {
    return !!state.el.error || (state.failed && state.el.readyState < 1);
  }

  /**
   * Drives one chapter's media layers.
   *
   * `segments` are the movements in order, each a video plus the two stills
   * it travels between. `seams` join them — seams[i] joins segment i to
   * i+1 — and never overlap, so at most one is in play at any scroll
   * position. Returns update(progress).
   *
   * A merely-slow video keeps its own layer (its poster is that movement's
   * opening frame). Only a broken one falls back to stills, and then the
   * pair crossfades by the movement's own progress so the chapter still
   * travels start -> end instead of snapping to the destination.
   */
  function createMediaSequence(config) {
    var segments = config.segments;
    var seams = config.seams;
    var style = config.style;
    var layers = config.layers;

    function contribute(out, segment, p, weight) {
      var localT = mapRange(p, segment.range[0], segment.range[1]);
      // A movement with no film of its own (state: null) is told with its two
      // frames, exactly as a broken video is.
      if (!segment.state || videoBroken(segment.state)) {
        out.push([segment.from, weight * (1 - localT)]);
        out.push([segment.to, weight * localT]);
        return;
      }
      scrubVideo(segment.state, localT);
      out.push([segment.state.el, weight]);
    }

    return function update(p) {
      var out = [];
      var i;

      var activeSeam = -1;
      for (i = 0; i < seams.length; i++) {
        if (p >= seams[i][0] && p < seams[i][1]) { activeSeam = i; break; }
      }

      if (activeSeam >= 0) {
        var w = seamWeights(mapRange(p, seams[activeSeam][0], seams[activeSeam][1]), style);
        if (w[0] > 0) contribute(out, segments[activeSeam], p, w[0]);
        if (w[1] > 0) contribute(out, segments[activeSeam + 1], p, w[1]);
      } else {
        // Outside a seam exactly one movement owns the frame: the one after
        // every seam already passed.
        var current = 0;
        for (i = 0; i < seams.length; i++) {
          if (p >= seams[i][1]) current = i + 1;
        }
        contribute(out, segments[current], p, 1);
      }

      // Accumulate: a still can be both the outgoing movement's end frame
      // and the incoming movement's start frame.
      var wanted = new Map();
      for (i = 0; i < out.length; i++) {
        wanted.set(out[i][0], (wanted.get(out[i][0]) || 0) + out[i][1]);
      }
      for (i = 0; i < layers.length; i++) {
        gsap.set(layers[i], { opacity: clamp01(wanted.get(layers[i]) || 0) });
      }
    };
  }

  global.VELORA = {
    seamWeights: seamWeights,
    createMediaSequence: createMediaSequence,
    videoBroken: videoBroken,
    clamp01: clamp01,
    mapRange: mapRange,
    trackVideo: trackVideo,
    warmVideo: warmVideo,
    scrubVideo: scrubVideo,
    METADATA_TIMEOUT_MS: METADATA_TIMEOUT_MS
  };
})(window);
