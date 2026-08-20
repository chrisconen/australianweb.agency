(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.querySelector("[data-hero]");
  const stage = hero && hero.querySelector(".hero-stage");
  const video = document.querySelector("[data-hero-video]");
  const poster = document.querySelector("[data-poster]");
  const fallback = document.querySelector("[data-fallback]");
  const header = document.querySelector("[data-header]");
  const menu = document.querySelector("[data-menu]");
  const toggle = document.querySelector("[data-menu-toggle]");
  const layers = document.querySelectorAll("[data-in]");
  const headline = document.querySelector(".hero h1");

  const DURATION = 39.208;
  const HOLD_START = 0.84;

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  const progress = () => {
    if (!hero) return 0;
    const total = hero.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-hero.getBoundingClientRect().top / total, 0, 1);
  };

  const mapTime = (p) => {
    if (p <= HOLD_START) return (p / HOLD_START) * 32.4;
    const h = (p - HOLD_START) / (1 - HOLD_START);
    if (h < 0.5) return 32.4 + h * 2.4;
    return 33.6 + ((h - 0.5) / 0.5) * (DURATION - 33.6);
  };

  const reveal = (el, p) => {
    const inn = parseFloat(el.dataset.in || "0");
    const out = parseFloat(el.dataset.out || "1");
    const fade = 0.05;
    let o = 0;
    if (p >= inn && p <= out) o = 1;
    else if (p < inn) o = clamp((p - inn + fade) / fade);
    else o = clamp((out + fade - p) / fade);
    el.style.opacity = o.toFixed(3);
    el.classList.toggle("is-on", o > 0.5);
  };

  const apply = (p) => {
    if (failed) p = 0.84;
    if (stage) {
      stage.style.setProperty("--p", p.toFixed(4));
      stage.style.setProperty("--route", (0.16 + p * 0.84).toFixed(4));
      const scrim = p < 0.18 ? 0.38 : p < 0.34 ? 0.55 : p < 0.5 ? 0.32 : 0.22;
      stage.style.setProperty("--scrim", scrim.toFixed(3));
      const handoff = failed || reduced ? 0 : clamp((p - 0.86) / 0.14, 0, 1);
      stage.style.setProperty("--handoff", handoff.toFixed(3));
    }
    layers.forEach((el) => reveal(el, p));
    if (headline) headline.classList.toggle("is-on", p >= 0.32);
    if (header) header.classList.toggle("is-active", p > 0.06);
  };

  let duration = DURATION;
  let lastTime = -1;
  let running = false;
  let failed = false;
  let meta = false;
  let smoothP = 0;
  let paintedP = -1;
  const EASE = 0.22;

  // ponytail: one seek in flight at a time — park the newest target, commit on
  // `seeked`. Measured neutral on a buffered local file (scripts/verify_scrub.py);
  // it's here to bound the queue when seeks land outside the buffered range and
  // take real time, where assigning currentTime every rAF piles up.
  let pendingT = -1;
  let seeking = false;

  const commitSeek = () => {
    if (seeking || pendingT < 0 || !video) return;
    const t = pendingT;
    pendingT = -1;
    lastTime = t;
    seeking = true;
    try {
      video.currentTime = t;
    } catch (_) {
      seeking = false; /* seek can throw before metadata */
    }
  };

  const seek = (p) => {
    if (!video || reduced || failed || !meta) return;
    const t = clamp(mapTime(p), 0, duration - 0.04);
    if (!Number.isFinite(t)) return;
    if (Math.abs(t - lastTime) < 0.04) return;
    pendingT = t;
    commitSeek();
  };

  const frame = () => {
    if (!running) return;

    const target = progress();
    const delta = target - smoothP;
    if (Math.abs(delta) < 0.0006) smoothP = target;
    else smoothP += delta * EASE;

    if (smoothP !== paintedP) {
      paintedP = smoothP;
      apply(smoothP);
      seek(smoothP);
    }
    requestAnimationFrame(frame);
  };

  const startLoop = () => {
    if (running || reduced) return;
    running = true;
    requestAnimationFrame(frame);
  };

  const stopLoop = () => {
    running = false;
  };

  const showFallback = () => {
    failed = true;
    stopLoop();
    if (video) video.style.display = "none";
    if (poster) poster.hidden = true;
    if (fallback) fallback.hidden = false;
    apply(1);
    if (headline) headline.classList.add("is-on");
    layers.forEach((el) => {
      el.classList.add("is-on");
      el.style.opacity = "1";
    });
  };

  if (reduced) {
    showFallback();
  } else {
    apply(0);
    if (video) {
      const mobile = matchMedia("(max-width: 767px)").matches;
      if (mobile) {
        video.src = "./media/web/hero-mobile.mp4";
        video.load();
      }
      const onMeta = () => {
        if (Number.isFinite(video.duration) && video.duration > 1) duration = video.duration;
        video.classList.add("is-ready");
        if (meta) return; // fires from 3 places; don't clobber an in-flight seek
        meta = true;
        video.pause();
        lastTime = -1;
        seek(progress());
      };
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("loadeddata", onMeta, { once: true });
      video.addEventListener("seeked", () => {
        seeking = false;
        commitSeek();
      });
      if (video.readyState >= 1) onMeta();
      startLoop();
      // ponytail: `error` is the only unrecoverable signal. A `stalled` used to
      // latch failed=true permanently — which a backgrounded tab or a slow
      // connection trips routinely, killing the scrub for the whole session.
      // A stall resolves itself; the scrub just holds the last decoded frame.
      video.addEventListener("error", showFallback);
    }

    if (hero) {
      new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          if (entry.isIntersecting) startLoop();
          else stopLoop();
        },
        { threshold: 0.01 }
      ).observe(hero);
    }

    window.addEventListener("resize", () => {
      lastTime = -1;
      paintedP = -1;
      smoothP = progress();
      if (!running) {
        apply(smoothP);
        seek(smoothP);
      }
    });
  }

  /* ---------------- 01 / THE TRANSFER ---------------- */

  const revealables = document.querySelectorAll("[data-rv]");
  if (revealables.length) {
    if (reduced) {
      revealables.forEach((el) => el.classList.add("is-in"));
    } else {
      const rvObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add("is-in");
            rvObserver.unobserve(e.target); // reveal is one-way, never re-plays
          });
        },
        { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
      );
      revealables.forEach((el) => rvObserver.observe(el));
    }
  }

  const trVideo = document.querySelector("[data-tr-video]");
  if (trVideo && !reduced) {
    const small = matchMedia("(max-width: 767px)").matches;
    let armed = false;
    let ended = false;
    let ratio = 0;

    // Both observers feed this: whichever resolves last drives the decision, so
    // arming after the block is already on screen still starts playback.
    const sync = () => {
      if (!armed || ended) return;
      if (ratio >= 0.35) {
        const p = trVideo.play();
        if (p) p.then(() => trVideo.classList.add("is-playing")).catch(() => {});
        else trVideo.classList.add("is-playing");
      } else if (ratio < 0.1) {
        trVideo.pause(); // hold position, never rewind
      }
    };

    // The hero owns the network budget at page start, so the source is attached
    // only once the chapter is roughly a viewport away.
    new IntersectionObserver(
      ([e], io) => {
        if (!e || !e.isIntersecting) return;
        trVideo.src = small ? trVideo.dataset.srcMobile : trVideo.dataset.srcDesktop;
        trVideo.load();
        armed = true;
        io.disconnect();
        sync();
      },
      { rootMargin: "100% 0px" }
    ).observe(trVideo);

    // ponytail: the clip does not loop cleanly (it opens on a rear 3/4 and ends
    // on a tight side profile), so it plays once and holds the last frame.
    trVideo.addEventListener("ended", () => {
      ended = true;
    });

    new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        ratio = e.intersectionRatio;
        sync();
      },
      { threshold: [0, 0.1, 0.35, 0.6] }
    ).observe(trVideo);
  }

  /* ---------------- 02 / PRIVATE ACCESS ---------------- */

  const access = document.querySelector("[data-access]");
  const accessVideo = document.querySelector("[data-access-video]");
  const accessMotion = accessVideo && accessVideo.closest(".ac-motion");

  // Header contrast changes once for the whole chapter. Individual bright and
  // dark frames never toggle it, preventing threshold flicker.
  if (access && header) {
    new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        header.classList.toggle("is-access", e.isIntersecting);
      },
      { threshold: 0 }
    ).observe(access);
  }

  if (accessVideo && access && !reduced) {
    let sourceAttached = false;
    let promoted = false;
    let ended = false;
    let failedAccess = false;
    let ratio = 0;

    const failAccessVideo = () => {
      failedAccess = true;
      accessVideo.pause();
      accessVideo.classList.remove("is-playing", "is-held");
      if (accessMotion) accessMotion.classList.add("is-failed");
    };

    const syncAccessVideo = () => {
      if (failedAccess || ended || !sourceAttached || !promoted) return;
      if (ratio >= 0.35) {
        const playback = accessVideo.play();
        if (playback) {
          playback
            .then(() => accessVideo.classList.add("is-playing"))
            .catch(() => {});
        } else {
          accessVideo.classList.add("is-playing");
        }
      } else if (ratio < 0.1) {
        accessVideo.pause();
      }
    };

    const attachMetadata = () => {
      if (sourceAttached || failedAccess) return;
      accessVideo.preload = "metadata";
      accessVideo.src = accessVideo.dataset.src;
      sourceAttached = true;
      accessVideo.load();
    };

    // The Hero and Transfer own the initial network budget. Access receives
    // only metadata once its chapter is within one viewport of the user.
    new IntersectionObserver(
      ([e], io) => {
        if (!e || !e.isIntersecting) return;
        attachMetadata();
        io.disconnect();
      },
      { rootMargin: "100% 0px" }
    ).observe(access);

    // Promote to media preload only near the boarding field. This is separate
    // from playback visibility so a decoded first frame can be ready in time.
    new IntersectionObserver(
      ([e], io) => {
        if (!e || !e.isIntersecting) return;
        attachMetadata();
        promoted = true;
        accessVideo.preload = "auto";
        accessVideo.load();
        io.disconnect();
        syncAccessVideo();
      },
      { rootMargin: "75% 0px" }
    ).observe(accessVideo);

    accessVideo.addEventListener("canplay", syncAccessVideo);
    accessVideo.addEventListener("playing", () => {
      accessVideo.classList.add("is-playing");
    });
    accessVideo.addEventListener("ended", () => {
      ended = true;
      accessVideo.classList.remove("is-playing");
      accessVideo.classList.add("is-held");
    });
    accessVideo.addEventListener("error", failAccessVideo);

    new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        ratio = e.intersectionRatio;
        syncAccessVideo();
      },
      { threshold: [0, 0.1, 0.35, 0.6] }
    ).observe(accessVideo);
  }

  /* ---------------- 03 / AIR ---------------- */

  const air = document.querySelector("[data-air]");
  const jetAirVideo = document.querySelector('[data-air-video="jet"]');
  const helicopterAirVideo = document.querySelector('[data-air-video="helicopter"]');

  // AIR uses one stable contrast treatment. The jet, cabin, sky, and graphite
  // phases do not independently flip the masthead while the user scrolls.
  if (air && header) {
    new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        header.classList.toggle("is-air", e.isIntersecting);
      },
      { threshold: 0 }
    ).observe(air);
  }

  const setupAirVideo = (airVideo, prepareTarget, prepareMargin = "100% 0px") => {
    if (!airVideo || !prepareTarget || reduced) return;

    const motion = airVideo.closest(".air-motion");
    let sourceAttached = false;
    let promoted = false;
    let ended = false;
    let failedAir = false;
    let ratio = 0;

    const fail = () => {
      failedAir = true;
      airVideo.pause();
      airVideo.classList.remove("is-playing", "is-held");
      if (motion) motion.classList.add("is-failed");
    };

    const sync = () => {
      if (failedAir || ended || !sourceAttached || !promoted) return;
      if (ratio >= 0.35) {
        const playback = airVideo.play();
        if (playback) {
          playback
            .then(() => airVideo.classList.add("is-playing"))
            .catch(() => {});
        } else {
          airVideo.classList.add("is-playing");
        }
      } else if (ratio < 0.1) {
        airVideo.pause();
      }
    };

    const attachMetadata = () => {
      if (sourceAttached || failedAir) return;
      airVideo.preload = "metadata";
      airVideo.src = airVideo.dataset.src;
      sourceAttached = true;
      airVideo.load();
    };

    new IntersectionObserver(
      ([e], io) => {
        if (!e || !e.isIntersecting) return;
        attachMetadata();
        io.disconnect();
      },
      { rootMargin: prepareMargin }
    ).observe(prepareTarget);

    new IntersectionObserver(
      ([e], io) => {
        if (!e || !e.isIntersecting) return;
        attachMetadata();
        promoted = true;
        airVideo.preload = "auto";
        airVideo.load();
        io.disconnect();
        sync();
      },
      { rootMargin: "75% 0px" }
    ).observe(airVideo);

    airVideo.addEventListener("canplay", sync);
    airVideo.addEventListener("playing", () => {
      airVideo.classList.add("is-playing");
    });
    airVideo.addEventListener("ended", () => {
      ended = true;
      airVideo.classList.remove("is-playing");
      airVideo.classList.add("is-held");
    });
    airVideo.addEventListener("error", fail);

    new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        ratio = e.intersectionRatio;
        sync();
      },
      { threshold: [0, 0.1, 0.35, 0.6] }
    ).observe(airVideo);
  };

  // Jet metadata is allowed only as AIR approaches. Helicopter metadata waits
  // for the multimodal transfer, so both AIR films never compete early.
  setupAirVideo(jetAirVideo, air);
  setupAirVideo(helicopterAirVideo, document.querySelector(".air-transfer"), "15% 0px");

  /* ---------------- 04 / BUSINESS ---------------- */

  const business = document.querySelector("[data-business]");
  const businessStage = business && business.querySelector("[data-business-stage]");
  const businessPanels = business
    ? [...business.querySelectorAll("[data-business-panel]")]
    : [];
  const businessCount = businessStage && businessStage.querySelector("[data-business-count]");
  const businessState = businessStage && businessStage.querySelector("[data-business-state]");
  const businessRouteLabels = businessStage
    ? [...businessStage.querySelectorAll(".business-route-labels span")]
    : [];
  const businessImages = business ? [...business.querySelectorAll("img")] : [];
  const businessDesktop = matchMedia("(min-width: 768px)");

  // Seven cover transitions from one normalized source. Earlier panels are
  // never assigned a negative X; once settled they remain fixed underneath.
  const businessRanges = [
    [0.1, 0.22],
    [0.22, 0.34],
    [0.34, 0.47],
    [0.47, 0.58],
    [0.58, 0.69],
    [0.69, 0.81],
    [0.81, 0.92],
  ];
  const businessRouteStates = [0.2, 0.31, 0.42, 0.54, 0.66, 0.78, 0.89, 1];
  const routeLabelPanels = [0, 1, 2, 3, 5, 6];
  let businessEngaged = false;
  let businessFrame = 0;
  let lateBusinessDecoded = false;

  const businessUsesPin = () => !reduced && businessDesktop.matches;

  const decodeBusiness = (start, end) => {
    businessImages.slice(start, end).forEach((image) => {
      image.loading = "eager";
      if (typeof image.decode === "function") image.decode().catch(() => {});
    });
  };

  const businessProgress = () => {
    if (!business) return 0;
    const total = business.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-business.getBoundingClientRect().top / total, 0, 1);
  };

  const applyBusiness = () => {
    businessFrame = 0;
    if (!business || !businessStage || !businessUsesPin()) return;

    const p = businessProgress();
    businessPanels[0]?.style.setProperty("--business-x", "0%");
    businessRanges.forEach(([start, end], index) => {
      const local = clamp((p - start) / (end - start), 0, 1);
      const x = (1 - local) * 100;
      businessPanels[index + 1]?.style.setProperty("--business-x", `${x.toFixed(4)}%`);
    });

    let active = 0;
    businessRanges.forEach(([start, end], index) => {
      // A sub-pixel scrollTop can land a fraction below the mathematical
      // midpoint. The small tolerance keeps the typographic state deterministic
      // across viewport heights without changing any panel motion.
      if (p + 0.001 >= (start + end) / 2) active = index + 1;
    });

    businessPanels.forEach((panel, index) => {
      if (index === active) panel.setAttribute("aria-current", "step");
      else panel.removeAttribute("aria-current");
    });

    if (businessCount) businessCount.textContent = `${String(active + 1).padStart(2, "0")} / 08`;
    if (businessState) businessState.textContent = businessPanels[active]?.dataset.businessName || "";
    businessStage.style.setProperty("--business-route", businessRouteStates[active].toFixed(2));
    businessRouteLabels.forEach((label, index) => {
      label.classList.toggle("is-passed", active >= routeLabelPanels[index]);
    });

    if (!lateBusinessDecoded && p >= 0.08) {
      lateBusinessDecoded = true;
      decodeBusiness(5, 8);
    }
  };

  const requestBusinessFrame = () => {
    if (!businessUsesPin() || businessFrame) return;
    businessFrame = requestAnimationFrame(applyBusiness);
  };

  if (business) {
    if (reduced) {
      businessPanels.forEach((panel) => panel.classList.add("is-in"));
      decodeBusiness(0, 8);
    } else {
      const airEgress = document.querySelector(".air-egress");
      if (airEgress) {
        new IntersectionObserver(
          ([entry], observer) => {
            if (!entry || !entry.isIntersecting) return;
            decodeBusiness(0, 2);
            observer.disconnect();
          },
          { rootMargin: "150% 0px" }
        ).observe(airEgress);
      }

      new IntersectionObserver(
        ([entry], observer) => {
          if (!entry || !entry.isIntersecting) return;
          decodeBusiness(2, 5);
          observer.disconnect();
        },
        { rootMargin: "35% 0px" }
      ).observe(business);

      const mobileBusinessObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add("is-in");
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
      );
      businessPanels.forEach((panel) => mobileBusinessObserver.observe(panel));
    }

    new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        businessEngaged = entry.isIntersecting;
        business.classList.toggle("is-engaged", businessEngaged && businessUsesPin());
        if (header) header.classList.toggle("is-business", businessEngaged);
        if (businessEngaged) requestBusinessFrame();
      },
      { threshold: 0 }
    ).observe(business);

    window.addEventListener("scroll", () => {
      if (businessEngaged) requestBusinessFrame();
    }, { passive: true });

    window.addEventListener("resize", () => {
      business.classList.toggle("is-engaged", businessEngaged && businessUsesPin());
      requestBusinessFrame();
    });

    applyBusiness();
  }

  /* ---------------- 05 / SEA ---------------- */

  const sea = document.querySelector("[data-sea]");
  const seaScenes = sea ? [...sea.querySelectorAll("[data-sea-scene]")] : [];
  const seaImages = sea ? [...sea.querySelectorAll("img")] : [];
  const seaRouteLabel = sea && sea.querySelector("[data-sea-route-label]");
  const seaRouteStates = {
    "marina edge": 0.26,
    "deck datum": 0.54,
    "open water": 0.82,
    horizon: 1,
  };

  const decodeSea = (start, end) => {
    seaImages.slice(start, end).forEach((image) => {
      image.loading = "eager";
      if (typeof image.decode === "function") image.decode().catch(() => {});
    });
  };

  const setSeaRoute = (state) => {
    if (!sea || !(state in seaRouteStates)) return;
    sea.dataset.seaRoute = state;
    sea.style.setProperty("--sea-route", seaRouteStates[state].toFixed(2));
    if (seaRouteLabel) seaRouteLabel.textContent = state;
  };

  if (sea) {
    if (reduced) {
      seaScenes.forEach((scene) => scene.classList.add("is-in"));
    } else {
      const seaRevealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            seaRevealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      seaScenes.forEach((scene) => seaRevealObserver.observe(scene));
    }

    // Reversible, discrete datum states. The line changes only when a scene
    // owns the center band; it is atmospheric language, never pixel progress.
    const seaRouteObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setSeaRoute(entry.target.dataset.seaRouteState || "marina edge");
        });
      },
      { threshold: 0, rootMargin: "-35% 0px -35% 0px" }
    );
    seaScenes.forEach((scene) => seaRouteObserver.observe(scene));

    // Header contrast changes once for the whole chapter. Bright sky, dark
    // water, and the salon never trigger independent threshold flicker.
    if (header) {
      new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          header.classList.toggle("is-sea", entry.isIntersecting);
        },
        { threshold: 0 }
      ).observe(sea);
    }

    const prepareSeaGroup = (target, start, end, rootMargin) => {
      if (!target) return;
      new IntersectionObserver(
        ([entry], observer) => {
          if (!entry || !entry.isIntersecting) return;
          decodeSea(start, end);
          observer.disconnect();
        },
        { rootMargin }
      ).observe(target);
    };

    // BUSINESS owns the network budget until its final hold. SEA imagery then
    // arrives in four causal groups; no SEA asset is eager at initial load.
    prepareSeaGroup(document.querySelector(".business-egress"), 0, 2, "120% 0px");
    prepareSeaGroup(sea, 2, 5, "40% 0px");
    prepareSeaGroup(seaScenes[2], 5, 7, "60% 0px");
    prepareSeaGroup(seaScenes[6], 7, 8, "80% 0px");
  }

  /* ---------------- 06 / RETURN ---------------- */

  const returnSection = document.querySelector("[data-return]");
  const returnStage = returnSection && returnSection.querySelector("[data-return-stage]");
  const returnScenes = returnSection
    ? [...returnSection.querySelectorAll("[data-return-scene]")]
    : [];
  const returnVideos = returnSection
    ? [...returnSection.querySelectorAll("[data-return-video]")]
    : [];
  const returnPosters = returnSection ? [...returnSection.querySelectorAll("img")] : [];
  const returnCount = returnStage && returnStage.querySelector("[data-return-count]");
  const returnState = returnStage && returnStage.querySelector("[data-return-state]");
  const returnDesktop = matchMedia("(min-width: 768px)");
  const returnStarts = [0.02, 0.18, 0.34, 0.5, 0.66, 0.82];
  const returnEnds = [0.18, 0.34, 0.5, 0.66, 0.82, 0.96];
  const returnRouteStates = [0.18, 0.34, 0.5, 0.66, 0.82, 1];
  const returnVideoState = returnVideos.map(() => ({
    attached: false,
    promoted: false,
    ready: false,
    meta: false,
    failed: false,
    seeking: false,
    pending: -1,
    lastTime: -1,
    duration: 6.041667,
  }));
  let returnEngaged = false;
  let returnFrame = 0;
  let returnActive = 0;
  let returnRenderedProgress = 0;
  const RETURN_FOLLOW = 0.2;

  const returnUsesScrub = () => !reduced && returnDesktop.matches;

  const returnProgress = () => {
    if (!returnSection) return 0;
    const travel = returnSection.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return clamp(-returnSection.getBoundingClientRect().top / travel, 0, 1);
  };

  const returnActiveIndex = (p) => {
    const found = returnEnds.findIndex((end) => p < end);
    return found < 0 ? returnScenes.length - 1 : found;
  };

  const decodeReturnPosters = (start, end) => {
    returnPosters.slice(start, end).forEach((image) => {
      image.loading = "eager";
      if (typeof image.decode === "function") image.decode().catch(() => {});
    });
  };

  const commitReturnSeek = (index) => {
    const video = returnVideos[index];
    const state = returnVideoState[index];
    if (!video || !state || state.failed || !state.meta || state.seeking || state.pending < 0) return;
    const target = state.pending;
    state.pending = -1;
    state.lastTime = target;
    state.seeking = true;
    try {
      video.currentTime = target;
    } catch (_) {
      state.seeking = false;
    }
  };

  const seekReturnVideo = (index, time) => {
    const state = returnVideoState[index];
    if (!state || state.failed || !Number.isFinite(time)) return;
    const target = clamp(time, 0, Math.max(0, state.duration - 0.04));
    if (Math.abs(target - state.lastTime) < 0.035) return;
    state.pending = target;
    if (state.meta) commitReturnSeek(index);
  };

  const attachReturnVideo = (index, preload = "metadata") => {
    if (!returnUsesScrub()) return;
    const video = returnVideos[index];
    const state = returnVideoState[index];
    if (!video || !state || state.failed) return;

    if (state.attached) {
      if (preload === "auto" && !state.promoted) {
        state.promoted = true;
        video.preload = "auto";
        if (video.readyState < 3) {
          state.meta = false;
          state.ready = false;
          video.classList.remove("is-ready");
          video.load();
        }
      }
      return;
    }

    video.muted = true;
    video.playsInline = true;
    video.preload = preload;
    video.src = video.dataset.src;
    state.attached = true;
    state.promoted = preload === "auto";
    video.load();
  };

  const prepareReturnMedia = (active) => {
    if (!returnUsesScrub()) return;
    decodeReturnPosters(active, Math.min(returnPosters.length, active + 2));
    attachReturnVideo(active, "auto");
    attachReturnVideo(active + 1, "metadata");
  };

  const applyReturn = (p) => {
    if (!returnSection || !returnStage || !returnScenes.length || !returnUsesScrub()) return;

    const active = returnActiveIndex(p);
    const opacities = returnScenes.map(() => 0);
    opacities[active] = 1;

    // A narrow linear crossfade makes the cut legible while keeping scroll and
    // reverse scroll causally identical. No scene translates or scales.
    if (active > 0) {
      const fade = 0.018;
      const blend = clamp((p - returnStarts[active]) / fade, 0, 1);
      if (blend < 1) {
        opacities[active] = blend;
        opacities[active - 1] = 1 - blend;
      }
    }

    returnScenes.forEach((scene, index) => {
      const opacity = opacities[index];
      scene.style.setProperty("--return-opacity", opacity.toFixed(3));
      scene.style.setProperty("--return-copy", clamp(opacity * 1.18, 0, 1).toFixed(3));
      scene.classList.toggle("is-active", index === active);
    });

    if (active !== returnActive) returnActive = active;
    if (returnCount) returnCount.textContent = `${String(active + 1).padStart(2, "0")} / 06`;
    if (returnState) returnState.textContent = returnScenes[active]?.dataset.returnLabel || "Return";
    returnSection.style.setProperty("--return-route", returnRouteStates[active].toFixed(2));

    if (returnEngaged) {
      prepareReturnMedia(active);
      const local = clamp(
        (p - returnStarts[active]) / (returnEnds[active] - returnStarts[active]),
        0,
        1
      );
      const state = returnVideoState[active];
      seekReturnVideo(active, local * (state?.duration || 6.041667));
    }
  };

  const requestReturnFrame = () => {
    if (returnFrame || !returnUsesScrub()) return;
    const tick = () => {
      returnFrame = 0;
      if (!returnEngaged || !returnUsesScrub()) return;

      const target = returnProgress();
      const delta = target - returnRenderedProgress;
      if (Math.abs(delta) <= 0.00035) returnRenderedProgress = target;
      else returnRenderedProgress += delta * RETURN_FOLLOW;

      applyReturn(returnRenderedProgress);
      if (Math.abs(target - returnRenderedProgress) > 0.00035) {
        returnFrame = requestAnimationFrame(tick);
      }
    };
    returnFrame = requestAnimationFrame(tick);
  };

  const clearReturnSources = () => {
    returnVideos.forEach((video, index) => {
      const state = returnVideoState[index];
      video.pause();
      video.classList.remove("is-ready");
      video.removeAttribute("src");
      video.load();
      Object.assign(state, {
        attached: false,
        promoted: false,
        ready: false,
        meta: false,
        seeking: false,
        pending: -1,
        lastTime: -1,
      });
    });
  };

  if (returnSection && returnStage && returnScenes.length === 6) {
    returnVideos.forEach((video, index) => {
      const state = returnVideoState[index];
      const onMetadata = () => {
        if (Number.isFinite(video.duration) && video.duration > 1) state.duration = video.duration;
        state.meta = true;
        video.pause();
        commitReturnSeek(index);
      };
      video.addEventListener("loadedmetadata", onMetadata);
      video.addEventListener("loadeddata", () => {
        state.ready = true;
        video.pause();
        video.classList.add("is-ready");
        commitReturnSeek(index);
      });
      video.addEventListener("seeked", () => {
        state.seeking = false;
        video.pause();
        commitReturnSeek(index);
      });
      video.addEventListener("error", () => {
        state.failed = true;
        state.seeking = false;
        state.pending = -1;
        video.pause();
        video.classList.remove("is-ready");
        video.style.display = "none";
      });
      if (video.readyState >= 1) onMetadata();
    });

    if (returnUsesScrub()) applyReturn(0);

    // SEA keeps priority until its final approach. RETURN-01 is promoted there;
    // RETURN-02 receives metadata only, and later films wait for prior states.
    const seaEgress = document.querySelector(".sea-egress");
    if (seaEgress && returnUsesScrub()) {
      new IntersectionObserver(
        ([entry], observer) => {
          if (!entry || !entry.isIntersecting) return;
          decodeReturnPosters(0, 2);
          attachReturnVideo(0, "auto");
          attachReturnVideo(1, "metadata");
          observer.disconnect();
        },
        { rootMargin: "100% 0px" }
      ).observe(seaEgress);
    }

    new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const wasEngaged = returnEngaged;
        returnEngaged = entry.isIntersecting;
        if (header) header.classList.toggle("is-return", returnEngaged);
        if (returnEngaged) {
          const target = returnProgress();
          // Direct navigation/reload inside RETURN should restore the correct
          // film immediately. Normal wheel/trackpad changes remain damped.
          if (!wasEngaged && Math.abs(target - returnRenderedProgress) > 0.28) {
            returnRenderedProgress = target;
            applyReturn(returnRenderedProgress);
          }
          requestReturnFrame();
        }
        else returnVideos.forEach((video) => video.pause());
      },
      { threshold: 0 }
    ).observe(returnSection);

    window.addEventListener("scroll", () => {
      if (returnEngaged) requestReturnFrame();
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (!returnUsesScrub()) clearReturnSources();
      else {
        returnRenderedProgress = returnProgress();
        applyReturn(returnRenderedProgress);
        requestReturnFrame();
      }
    });

    if (typeof returnDesktop.addEventListener === "function") {
      returnDesktop.addEventListener("change", () => {
        if (!returnUsesScrub()) clearReturnSources();
        else requestReturnFrame();
      });
    }
  }

  const closeMenu = () => {
    if (!menu || !toggle) return;
    menu.hidden = true;
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  const openMenu = () => {
    if (!menu || !toggle) return;
    menu.hidden = false;
    toggle.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      if (menu.hidden) openMenu();
      else closeMenu();
    });
    menu.querySelectorAll("[data-menu-close]").forEach((el) => {
      el.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }
})();
