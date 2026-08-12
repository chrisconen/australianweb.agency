/* AUREON PRIME — foundation motion + approved hero choreography */
(() => {
  "use strict";

  /* =========================================================
     Shared motion system
     Heavy · smooth · expensive — transform + opacity only
     ========================================================= */
  const Motion = {
    reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    finePointer: window.matchMedia("(pointer: fine)").matches,
    hasGsap: typeof gsap !== "undefined",

    /** Ease presets for upcoming sections */
    ease: {
      heavy: "power4.out",
      soft: "power3.out",
      editorial: "power3.inOut",
      scrub: "none",
    },

    /** Default reveal config */
    reveal: {
      y: 40,
      duration: 1.15,
      stagger: 0.09,
      start: "top 88%",
      ease: "power4.out",
    },
  };

  window.AureonMotion = Motion;

  const header = document.getElementById("header");
  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const glow = document.querySelector(".cursor-glow");

  /* ---------- Header scroll state ---------- */
  const onScrollHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------- Mobile menu ---------- */
  if (menuToggle && mobileMenu) {
    const setMenu = (open) => {
      menuToggle.setAttribute("aria-expanded", String(open));
      mobileMenu.classList.toggle("is-open", open);
      if (open) {
        mobileMenu.hidden = false;
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
        window.setTimeout(() => {
          if (!mobileMenu.classList.contains("is-open")) mobileMenu.hidden = true;
        }, 450);
      }
    };

    menuToggle.addEventListener("click", () => {
      const open = menuToggle.getAttribute("aria-expanded") !== "true";
      setMenu(open);
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- Cursor glow ---------- */
  if (glow && !Motion.reduce && Motion.finePointer) {
    document.body.classList.add("is-pointer");
    let mx = 0;
    let my = 0;
    let gx = 0;
    let gy = 0;

    window.addEventListener(
      "pointermove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
      },
      { passive: true }
    );

    const tickGlow = () => {
      gx += (mx - gx) * 0.12;
      gy += (my - gy) * 0.12;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      requestAnimationFrame(tickGlow);
    };
    requestAnimationFrame(tickGlow);
  }

  /* ---------- Intersection reveals (CSS path / no-GSAP fallback) ---------- */
  const markRevealsIn = (els) => {
    els.forEach((el) => el.classList.add("is-in"));
  };

  const setupCssReveals = () => {
    const revealEls = document.querySelectorAll("[data-reveal], [data-reveal-clip]");
    if (!revealEls.length) return;

    /* Assign stagger indices for CSS transition-delay */
    document.querySelectorAll("[data-reveal-stagger]").forEach((parent) => {
      Array.from(parent.querySelectorAll("[data-reveal]")).forEach((child, i) => {
        child.style.setProperty("--reveal-i", String(i));
      });
    });

    if (Motion.reduce) {
      markRevealsIn(revealEls);
      return;
    }

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      markRevealsIn(revealEls);
    }
  };

  /* ---------- Video: play when in view ---------- */
  Motion.bindInViewVideos = (root = document) => {
    const videos = root.querySelectorAll("[data-video-inview], .video-section__video");
    if (!videos.length) return;

    if (Motion.reduce) {
      videos.forEach((v) => {
        v.pause();
        v.removeAttribute("autoplay");
      });
      return;
    }

    if (!("IntersectionObserver" in window)) return;

    const vio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (!(video instanceof HTMLVideoElement)) return;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.35 }
    );

    videos.forEach((v) => vio.observe(v));
  };

  /* ---------- GSAP utilities for progressive sections ---------- */
  Motion.revealElements = (selector = "[data-reveal]", options = {}) => {
    if (Motion.reduce || !Motion.hasGsap) return null;

    const defaults = Motion.reveal;
    const els = gsap.utils.toArray(selector);
    if (!els.length) return null;

    return gsap.fromTo(
      els,
      {
        opacity: 0,
        y: options.y ?? defaults.y,
        x: options.x ?? 0,
        scale: options.scale ?? 1,
      },
      {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        duration: options.duration ?? defaults.duration,
        stagger: options.stagger ?? defaults.stagger,
        ease: options.ease ?? defaults.ease,
        clearProps: options.clearProps ?? "transform",
        scrollTrigger: {
          trigger: options.trigger || els[0],
          start: options.start ?? defaults.start,
          toggleActions: "play none none none",
          once: options.once !== false,
          ...(options.scrollTrigger || {}),
        },
        onStart: options.onStart,
        onComplete: () => {
          els.forEach((el) => el.classList.add("is-in"));
          if (typeof options.onComplete === "function") options.onComplete();
        },
      }
    );
  };

  /**
   * Subtle scrub parallax on an element.
   * @param {string|Element} target
   * @param {{ yPercent?: number, xPercent?: number, trigger?: string|Element, start?: string, end?: string }} opts
   */
  Motion.parallax = (target, opts = {}) => {
    if (Motion.reduce || !Motion.hasGsap) return null;
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;

    return gsap.to(el, {
      yPercent: opts.yPercent ?? 12,
      xPercent: opts.xPercent ?? 0,
      ease: "none",
      scrollTrigger: {
        trigger: opts.trigger || el.parentElement || el,
        start: opts.start || "top bottom",
        end: opts.end || "bottom top",
        scrub: opts.scrub ?? true,
      },
    });
  };

  /**
   * Scale-down media inside a mask on scroll (cinematic settle).
   */
  Motion.mediaSettle = (target, opts = {}) => {
    if (Motion.reduce || !Motion.hasGsap) return null;
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;

    return gsap.fromTo(
      el,
      { scale: opts.fromScale ?? 1.12 },
      {
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: opts.trigger || el.closest(".media-mask") || el,
          start: opts.start || "top 90%",
          end: opts.end || "bottom 45%",
          scrub: true,
        },
      }
    );
  };

  /**
   * Clip-line headline reveal (overflow hidden parent, span children).
   */
  Motion.clipLines = (selector = "[data-reveal-clip]", opts = {}) => {
    if (Motion.reduce || !Motion.hasGsap) return null;
    const blocks = gsap.utils.toArray(selector);
    if (!blocks.length) return null;

    const tweens = blocks.map((block) => {
      const lines = block.querySelectorAll(":scope > span");
      if (!lines.length) return null;
      return gsap.fromTo(
        lines,
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: opts.duration ?? 1.25,
          stagger: opts.stagger ?? 0.1,
          ease: opts.ease ?? "power4.out",
          scrollTrigger: {
            trigger: block,
            start: opts.start || "top 88%",
            once: true,
          },
          onComplete: () => block.classList.add("is-in"),
        }
      );
    });

    return tweens.filter(Boolean);
  };

  /** Refresh ScrollTrigger after layout / media load */
  Motion.refresh = () => {
    if (Motion.hasGsap && typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  };

  /* Init CSS reveals + inview video always (works without GSAP too) */
  setupCssReveals();
  Motion.bindInViewVideos();

  /* Smooth section link offset for fixed header */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top: y, behavior: Motion.reduce ? "auto" : "smooth" });
    });
  });

  /* ---------- GSAP cinematic layer (hero + shared setup) ---------- */
  if (Motion.reduce || !Motion.hasGsap) {
    document.querySelectorAll(".reveal-hero").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* Hero load sequence — APPROVED, do not alter timing/targets */
  const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
  heroTl
    .fromTo(
      ".hero-video",
      { scale: 1.12, opacity: 0.4 },
      { scale: 1, opacity: 1, duration: 2.2, ease: "power2.out" },
      0
    )
    .fromTo(
      ".hero-kicker",
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9 },
      0.35
    )
    .fromTo(
      ".hero-title-line > span",
      { y: "110%" },
      { y: "0%", duration: 1.15, stagger: 0.12, ease: "power4.out" },
      0.45
    )
    .fromTo(
      ".hero-cta-wrap",
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 },
      0.95
    )
    .fromTo(
      ".hero-lede",
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.85 },
      1.05
    )
    .fromTo(
      ".hero-rail--left .stat-card",
      { x: -24, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, stagger: 0.07 },
      1.05
    )
    .fromTo(
      ".hero-rail--right .highlight-item",
      { x: 24, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, stagger: 0.1 },
      1.15
    )
    .fromTo(
      ".site-header",
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 },
      0.8
    );

  /* Hero parallax on scroll — APPROVED */
  gsap.to(".hero-video", {
    yPercent: 14,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.to(".hero-center", {
    y: -36,
    opacity: 0.2,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.to([".hero-rail--left", ".hero-rail--right"], {
    opacity: 0.15,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "80% top",
      scrub: true,
    },
  });

  /* Auto-wire common data attributes for future sections */
  const wireFutureSections = () => {
    /* Parallax nodes */
    gsap.utils.toArray("[data-parallax]").forEach((el) => {
      const amount = parseFloat(el.getAttribute("data-parallax")) || 12;
      Motion.parallax(el, { yPercent: amount });
    });

    /* Media settle */
    gsap.utils.toArray("[data-media-settle]").forEach((el) => {
      Motion.mediaSettle(el);
    });

    /* Clip lines via GSAP when present */
    if (document.querySelector("[data-reveal-clip]")) {
      Motion.clipLines();
    }
  };

  /* =========================================================
     SECTION 01 — Silhouette: horizontal light reveal
     ========================================================= */
  const initSilhouette = () => {
    const section = document.getElementById("silhouette");
    const pin = section && section.querySelector(".silhouette-pin");
    const mask = document.getElementById("silhouetteMask");
    if (!section || !pin || !mask) return;

    const copyEls = section.querySelectorAll("[data-sil-copy]");
    const annos = section.querySelectorAll("[data-sil-anno]");
    const axisH = section.querySelector(".silhouette-axis--h");
    const axisV = section.querySelector(".silhouette-axis--v");

    /* Copy enters as section approaches */
    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: "power4.out",
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    /* Pinned scroll: controlled light opens left → right */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=160%",
        scrub: 0.85,
        pin: pin,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.fromTo(
      mask,
      { clipPath: "inset(0 100% 0 0)" },
      { clipPath: "inset(0 0% 0 0)", ease: "none", duration: 1 },
      0
    );

    /* Image stays still — whisper of settle only, no flying */
    const img = mask.querySelector(".silhouette-img");
    if (img) {
      tl.fromTo(
        img,
        { scale: 1.06 },
        { scale: 1.02, ease: "none", duration: 1 },
        0
      );
    }

    /* Technical axes draw with the light */
    if (axisH) {
      tl.fromTo(
        axisH,
        { opacity: 0, scaleX: 0 },
        { opacity: 0.55, scaleX: 1, ease: "none", duration: 0.55 },
        0.2
      );
    }
    if (axisV) {
      tl.fromTo(
        axisV,
        { opacity: 0, scaleY: 0 },
        { opacity: 0.4, scaleY: 1, ease: "none", duration: 0.55 },
        0.35
      );
    }

    /* Annotations appear late, restrained */
    if (annos.length) {
      tl.fromTo(
        annos,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, stagger: 0.08, ease: "none", duration: 0.35 },
        0.55
      );
    }
  };

  /* =========================================================
     SECTION 02 — Airflow: expand + opposite depth parallax
     ========================================================= */
  const initAirflow = () => {
    const section = document.getElementById("airflow");
    const frame = document.getElementById("airflowFrame");
    const mask = section && section.querySelector(".airflow-mask");
    const video = document.getElementById("airflowVideo");
    const copy = section && section.querySelector(".airflow-copy");
    if (!section || !frame || !mask) return;

    const copyEls = section.querySelectorAll("[data-air-copy]");
    const annos = section.querySelectorAll("[data-air-anno]");
    const isDesktop = () => window.matchMedia("(min-width: 900px)").matches;

    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 1.05,
        stagger: 0.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    /* Expand frame 75vw → 100vw + open mask; scrubbed */
    const expandTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 75%",
        end: "top 5%",
        scrub: 0.9,
        invalidateOnRefresh: true,
      },
    });

    expandTl.fromTo(
      frame,
      {
        width: () => (isDesktop() ? "75vw" : "92vw"),
      },
      {
        width: "100vw",
        ease: "none",
        duration: 1,
      },
      0
    );

    expandTl.fromTo(
      mask,
      {
        clipPath: () =>
          isDesktop() ? "inset(6% 5% 6% 5%)" : "inset(4% 3% 4% 3%)",
      },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        ease: "none",
        duration: 1,
      },
      0
    );

    if (video) {
      expandTl.fromTo(
        video,
        { scale: 1.06 },
        { scale: 1, ease: "none", duration: 1 },
        0
      );
    }

    /* Annotations fade in as media expands */
    if (annos.length) {
      expandTl.fromTo(
        annos,
        { opacity: 0 },
        { opacity: 1, stagger: 0.06, ease: "none", duration: 0.4 },
        0.35
      );
    }

    /* Depth: type moves opposite the media */
    if (copy) {
      gsap.fromTo(
        copy,
        { y: 36 },
        {
          y: -48,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }

    if (video) {
      gsap.fromTo(
        video,
        { yPercent: -4 },
        {
          yPercent: 4,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }

    /* Ensure looped playback when near viewport */
    if (video) {
      ScrollTrigger.create({
        trigger: section,
        start: "top 90%",
        end: "bottom 10%",
        onEnter: () => video.play().catch(() => {}),
        onEnterBack: () => video.play().catch(() => {}),
        onLeave: () => video.pause(),
        onLeaveBack: () => video.pause(),
      });
    }
  };

  /* =========================================================
     SECTION 03 — X-ray: vertical mask EXTERIOR → ENGINEERING
     ========================================================= */
  const initXray = () => {
    const section = document.getElementById("engineering");
    const pin = section && section.querySelector(".xray-pin");
    const eng = document.getElementById("xrayEngineering");
    const divider = document.getElementById("xrayDivider");
    const compare = document.getElementById("xrayCompare");
    if (!section || !pin || !eng || !compare) return;

    const copyEls = section.querySelectorAll("[data-xray-copy]");
    const callouts = section.querySelectorAll("[data-xray-callout]");
    const modeExt = section.querySelector(".xray-mode--ext");
    const modeEng = section.querySelector(".xray-mode--eng");

    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: 1.05,
        stagger: 0.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    /* Pin + scrub: mask opens left → right (vertical edge) */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=170%",
        scrub: 0.85,
        pin: pin,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          if (modeExt && modeEng) {
            modeExt.classList.toggle("is-active", p < 0.55);
            modeEng.classList.toggle("is-active", p >= 0.35);
          }
        },
      },
    });

    tl.fromTo(
      eng,
      { clipPath: "inset(0 100% 0 0)" },
      { clipPath: "inset(0 0% 0 0)", ease: "none", duration: 1 },
      0
    );

    if (divider) {
      /* Divider rides the reveal edge */
      tl.fromTo(
        divider,
        { left: "0%", opacity: 0.9 },
        { left: "100%", opacity: 0.35, ease: "none", duration: 1 },
        0
      );
    }

    /* Callouts fade in once engineering is partially revealed */
    if (callouts.length) {
      tl.fromTo(
        callouts,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.06,
          ease: "none",
          duration: 0.3,
        },
        0.42
      );
    }

    /* Seed exterior mode active at start */
    if (modeExt) modeExt.classList.add("is-active");
  };

  /* =========================================================
     SECTION 04 — Exploded architecture: index + subtle depth
     ========================================================= */
  const initExploded = () => {
    const section = document.getElementById("architecture");
    const pin = section && section.querySelector(".exploded-pin");
    const media = document.getElementById("explodedMedia");
    const index = document.getElementById("explodedIndex");
    if (!section || !pin || !media || !index) return;

    const copyEls = section.querySelectorAll("[data-exp-copy]");
    const items = Array.from(index.querySelectorAll(".exploded-index-item"));
    const figure = media.querySelector(".exploded-figure");
    const layerBack = media.querySelector('[data-exp-layer="back"]');
    const layerMid = media.querySelector('[data-exp-layer="mid"]');
    const layerFront = media.querySelector('[data-exp-layer="front"]');

    const setActiveIndex = (active) => {
      items.forEach((item, i) => {
        item.classList.toggle("is-active", i === active);
        item.classList.toggle("is-passed", i < active);
      });
    };

    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 1.05,
        stagger: 0.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    /* Pin while scrolling through architecture layers */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=180%",
        scrub: 0.9,
        pin: pin,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const steps = items.length;
          const idx = Math.min(steps - 1, Math.floor(self.progress * steps));
          setActiveIndex(idx);
        },
      },
    });

    /* Extremely restrained depth — no wild separation */
    if (figure) {
      tl.fromTo(
        figure,
        { yPercent: 2, scale: 0.985 },
        { yPercent: -2, scale: 1.015, ease: "none", duration: 1 },
        0
      );
    }

    if (layerBack) {
      tl.fromTo(
        layerBack,
        { yPercent: 4, opacity: 0.35 },
        { yPercent: -3, opacity: 0.55, ease: "none", duration: 1 },
        0
      );
    }

    if (layerMid) {
      tl.fromTo(
        layerMid,
        { yPercent: 2, opacity: 0.45 },
        { yPercent: -1.5, opacity: 0.7, ease: "none", duration: 1 },
        0
      );
    }

    if (layerFront) {
      tl.fromTo(
        layerFront,
        { yPercent: 0, opacity: 0.25 },
        { yPercent: 2.5, opacity: 0.45, ease: "none", duration: 1 },
        0
      );
    }

    /* Index list subtle copper track progress via CSS classes only */
    setActiveIndex(0);
  };

  /* =========================================================
     SECTION 05 — Energy core: pan + current line
     ========================================================= */
  const initEnergy = () => {
    const section = document.getElementById("energy");
    const pin = section && section.querySelector(".energy-pin");
    const pan = document.getElementById("energyPan");
    const path = document.getElementById("energyCurrentPath");
    const bridge = document.getElementById("energyBridgeLine");
    if (!section || !pin || !pan) return;

    const copyEls = section.querySelectorAll("[data-energy-copy]");
    const callouts = section.querySelectorAll("[data-energy-callout]");

    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 1.05,
        stagger: 0.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=165%",
        scrub: 0.9,
        pin: pin,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    /* Cinematic pan across oversized battery — no flying car */
    tl.fromTo(
      pan,
      { xPercent: 0, yPercent: 0, scale: 1 },
      { xPercent: -12, yPercent: 4, scale: 1.04, ease: "none", duration: 1 },
      0
    );

    /* Copper current draws along conductor path (pathLength=1) */
    if (path) {
      gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
      tl.to(
        path,
        { strokeDashoffset: 0, ease: "none", duration: 0.85 },
        0.08
      );
    }

    if (callouts.length) {
      tl.fromTo(
        callouts,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, stagger: 0.08, ease: "none", duration: 0.28 },
        0.28
      );
    }

    /* Bridge line grows toward §06 as section ends */
    if (bridge) {
      gsap.fromTo(
        bridge,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "bottom 85%",
            end: "bottom 35%",
            scrub: true,
          },
        }
      );
    }
  };

  /* =========================================================
     SECTION 06 — Electric heart: scroll-scrubbed motor video
     Pin while scrubbing; after last frame, page scrolls on
     ========================================================= */
  const initDrive = () => {
    const section = document.getElementById("drive");
    const pin = document.getElementById("drivePin");
    const video = document.getElementById("driveVideo");
    if (!section || !pin || !video) return;

    const copyEls = section.querySelectorAll("[data-drive-copy]");
    const techItems = section.querySelectorAll("[data-drive-tech]");
    const arcs = section.querySelectorAll("[data-drive-arc]");
    const currentIn = document.getElementById("driveCurrentLine");

    /* Prepare video for scrubbing — never free-run */
    video.pause();
    video.muted = true;
    video.playsInline = true;
    video.loop = false;
    try {
      video.removeAttribute("autoplay");
    } catch (_) {
      /* ignore */
    }

    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 1.05,
        stagger: 0.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    if (currentIn) {
      gsap.fromTo(
        currentIn,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "top+=20% top",
            scrub: true,
          },
        }
      );
    }

    if (arcs.length) {
      gsap.fromTo(
        arcs,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1.2,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            toggleActions: "play none none none",
            once: true,
          },
        }
      );

      gsap.to(".drive-arc--1", {
        rotation: 6,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(".drive-arc--2", {
        rotation: -5,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }

    if (techItems.length) {
      gsap.fromTo(
        techItems,
        { opacity: 0, x: 16 },
        {
          opacity: 1,
          x: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            toggleActions: "play none none none",
            once: true,
          },
        }
      );
    }

    /**
     * Smooth scroll-scrub for HTML5 video.
     * Avoids seek thrash: one pending seek at a time, continuous RAF lerp,
     * longer runway, and denser-keyframe source when available.
     */
    let goalTime = 0;
    let smoothTime = 0;
    let scrubActive = false;
    let seekPending = false;
    let loopRaf = 0;
    let lastSeekAt = 0;

    const clampTime = (t) => {
      const d = video.duration || 0;
      if (!d) return 0;
      return Math.max(0, Math.min(d - 0.001, t));
    };

    const seekTo = (t) => {
      if (seekPending || video.seeking) return;
      const next = clampTime(t);
      if (Math.abs(video.currentTime - next) < 0.02) return;

      seekPending = true;
      lastSeekAt = performance.now();

      const done = () => {
        video.removeEventListener("seeked", done);
        seekPending = false;
      };
      video.addEventListener("seeked", done);

      try {
        if (typeof video.fastSeek === "function") video.fastSeek(next);
        else video.currentTime = next;
      } catch (_) {
        seekPending = false;
      }

      /* Safety: if seeked never fires, unlock after a frame budget */
      window.setTimeout(() => {
        if (seekPending && performance.now() - lastSeekAt > 180) {
          seekPending = false;
        }
      }, 200);
    };

    const tick = () => {
      loopRaf = requestAnimationFrame(tick);
      if (!scrubActive || !video.duration) return;

      /* Exponential ease toward scroll goal — softens wheel/trackpad spikes */
      const delta = goalTime - smoothTime;
      const abs = Math.abs(delta);
      if (abs < 0.001) {
        smoothTime = goalTime;
      } else if (abs > 0.45) {
        /* Large jump (fast flick): snap, then recover */
        smoothTime = goalTime;
      } else {
        smoothTime += delta * 0.22;
      }

      if (video.seeking || seekPending) return;

      const gap = smoothTime - video.currentTime;
      const agap = Math.abs(gap);

      if (agap < 0.025) {
        if (!video.paused) video.pause();
        return;
      }

      /*
        Forward & close: prefer adaptive play over micro-seeks (much smoother).
        Reverse or large gap: single seek (source should be dense-keyframe).
      */
      if (gap > 0 && gap < 0.4) {
        video.playbackRate = Math.min(2.25, 0.85 + gap * 4);
        if (video.paused) {
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => seekTo(smoothTime));
        }
      } else {
        if (!video.paused) video.pause();
        video.playbackRate = 1;
        seekTo(smoothTime);
      }
    };

    const startLoop = () => {
      if (loopRaf) return;
      loopRaf = requestAnimationFrame(tick);
    };

    let scrubBuilt = false;

    const buildScrub = () => {
      const duration = video.duration;
      if (!duration || !Number.isFinite(duration)) return;

      /* Never rebuild — killing/recreating pins mid-page causes jump-back */
      if (scrubBuilt || ScrollTrigger.getById("driveVideoScrub")) return;
      scrubBuilt = true;

      video.pause();
      video.playbackRate = 1;
      try {
        video.currentTime = 0;
      } catch (_) {
        /* ignore */
      }
      goalTime = 0;
      smoothTime = 0;
      scrubActive = true;
      startLoop();

      ScrollTrigger.create({
        id: "driveVideoScrub",
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          goalTime = clampTime(self.progress * duration);
        },
        onEnter: () => {
          scrubActive = true;
          startLoop();
        },
        onEnterBack: () => {
          scrubActive = true;
          startLoop();
        },
      });

      /* Geometry is CSS-owned, so metadata arrival cannot shift later scenes. */
      requestAnimationFrame(() => Motion.refresh());
    };

    const armWhenReady = () => {
      if (video.readyState >= 1 && video.duration) {
        buildScrub();
        return;
      }
      const onReady = () => {
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("loadeddata", onReady);
        buildScrub();
      };
      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("loadeddata", onReady);
      try {
        video.load();
      } catch (_) {
        /* ignore */
      }
      window.setTimeout(() => {
        if (!scrubBuilt) buildScrub();
      }, 800);
    };

    armWhenReady();
  };

  /* =========================================================
     SECTIONS 07 + 08 — pin once; wheels slides from right
     over brakes, then stops cleanly (no loop / jump-back)
     ========================================================= */
  const initBrakesWheelsSlide = () => {
    const scene = document.getElementById("brakesWheelsStack");
    const pin = document.getElementById("brakesWheelsPin");
    const wheels = document.getElementById("wheels");
    if (!scene || !pin || !wheels) return;

    const copyEls = wheels.querySelectorAll("[data-wheels-copy]");
    const descs = wheels.querySelectorAll("[data-wheels-desc]");

    const existing = ScrollTrigger.getById("brakesWheelsSlide");
    if (existing) existing.kill();

    /*
      One timeline owns the panel and its copy. The first 80% moves the panel;
      the remaining 20% holds the completed frame long enough to read it.
      Keeping every state scroll-linked also makes reverse scrolling exact.
    */
    gsap.set(wheels, { xPercent: 100, force3D: true });
    gsap.set(copyEls, { opacity: 0, y: 24 });
    gsap.set(descs, { opacity: 0, y: 8 });

    const settle = { progress: 0 };
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: "brakesWheelsSlide",
        trigger: scene,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    timeline
      .to(wheels, { xPercent: 0, duration: 0.8, ease: "none" }, 0)
      .to(
        copyEls,
        {
          opacity: 1,
          y: 0,
          duration: 0.16,
          stagger: 0.035,
          ease: "power2.out",
        },
        0.55
      )
      .to(
        descs,
        {
          opacity: 1,
          y: 0,
          duration: 0.14,
          stagger: 0.03,
          ease: "power2.out",
        },
        0.63
      )
      .to(settle, { progress: 1, duration: 0.17, ease: "none" }, 0.83);
  };

  /* =========================================================
     SECTION 07 — Brakes: full-bleed image, light copy reveal
     ========================================================= */
  const initBrakes = () => {
    const section = document.getElementById("brakes");
    if (!section) return;

    const copyEls = section.querySelectorAll("[data-brakes-copy]");
    const mats = section.querySelectorAll("[data-brakes-mat]");
    const img = section.querySelector(".brakes-img");
    const scene = document.getElementById("brakesWheelsStack");
    const triggerEl = scene || section;

    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 1.05,
        stagger: 0.1,
        ease: "power4.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: triggerEl,
          start: "top 80%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    gsap.from(mats, {
      opacity: 0,
      y: 10,
      duration: 0.9,
      stagger: 0.08,
      ease: "power3.out",
      immediateRender: false,
      scrollTrigger: {
        trigger: triggerEl,
        start: "top 75%",
        toggleActions: "play none none none",
        once: true,
      },
    });

    if (img) {
      gsap.fromTo(
        img,
        { scale: 1.05 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: triggerEl,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }
  };

  /* =========================================================
     SECTION 08 — Wheel configurator: crossfade + micro rotate
     ========================================================= */
  const initWheels = () => {
    const section = document.getElementById("wheels");
    if (!section) return;

    const config = document.getElementById("wheelsConfig");
    const hero = document.getElementById("wheelsHero");
    const panels = hero ? Array.from(hero.querySelectorAll(".wheels-figure")) : [];
    const tabs = Array.from(section.querySelectorAll("[data-wheel-tab]"));
    let active = 0;
    let animating = false;

    if (!config || !hero || !panels.length) return;

    const setActive = (index, { fromSwipe } = {}) => {
      const next = ((index % panels.length) + panels.length) % panels.length;
      if (next === active || animating) return;
      animating = true;

      const prevPanel = panels[active];
      const nextPanel = panels[next];
      const dir = next > active || (active === panels.length - 1 && next === 0) ? 1 : -1;

      tabs.forEach((tab, i) => {
        const on = i === next;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
      });

      if (Motion.reduce || !Motion.hasGsap) {
        panels.forEach((p, i) => p.classList.toggle("is-active", i === next));
        active = next;
        animating = false;
        return;
      }

      /* Elegant crossfade + 8–12° rotation + subtle scale */
      const rotOut = dir * (fromSwipe ? 12 : 10);
      const rotInFrom = dir * -8;

      gsap.killTweensOf([prevPanel, nextPanel]);

      prevPanel.classList.remove("is-active");
      nextPanel.classList.add("is-active");

      gsap.set(nextPanel, {
        opacity: 0,
        scale: 0.96,
        rotation: rotInFrom,
        visibility: "visible",
        zIndex: 2,
      });
      gsap.set(prevPanel, { zIndex: 1, visibility: "visible" });

      const tl = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => {
          gsap.set(prevPanel, { clearProps: "transform,opacity,visibility,zIndex" });
          gsap.set(nextPanel, { clearProps: "transform,opacity,visibility,zIndex" });
          prevPanel.classList.remove("is-exit");
          panels.forEach((p, i) => p.classList.toggle("is-active", i === next));
          active = next;
          animating = false;
        },
      });

      tl.to(
        prevPanel,
        {
          opacity: 0,
          scale: 0.97,
          rotation: rotOut,
          duration: 0.85,
        },
        0
      ).to(
        nextPanel,
        {
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 0.95,
        },
        0.08
      );
    };

    tabs.forEach((tab) => {
      const idx = Number(tab.getAttribute("data-wheel-tab"));
      tab.addEventListener("click", () => setActive(idx));
      tab.addEventListener("mouseenter", () => {
        if (Motion.finePointer) setActive(idx);
      });
    });

    /* Touch / swipe */
    let touchX = 0;
    let touchY = 0;
    let tracking = false;

    hero.addEventListener(
      "touchstart",
      (e) => {
        if (!e.changedTouches[0]) return;
        tracking = true;
        touchX = e.changedTouches[0].clientX;
        touchY = e.changedTouches[0].clientY;
      },
      { passive: true }
    );

    hero.addEventListener(
      "touchend",
      (e) => {
        if (!tracking || !e.changedTouches[0]) return;
        tracking = false;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) setActive(active + 1, { fromSwipe: true });
        else setActive(active - 1, { fromSwipe: true });
      },
      { passive: true }
    );

    /* Keyboard when focused in configurator */
    config.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActive(active + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActive(active - 1);
      }
    });
  };

  /* =========================================================
     SECTION 09 — Paint: oversized video + light evolution
     ========================================================= */
  const initPaint = () => {
    const section = document.getElementById("paint");
    if (!section) return;

    const copyEls = section.querySelectorAll("[data-paint-copy]");
    const video = document.getElementById("paintVideo");
    const media = document.getElementById("paintMedia");
    const light = document.getElementById("paintLight");
    const word = section.querySelector(".paint-bg-word-text");

    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        stagger: 0.1,
        ease: "power4.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    if (word) {
      gsap.fromTo(
        word,
        { opacity: 0.04, scale: 1.06 },
        {
          opacity: 0.09,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }

    /* Oversized media: gentle settle, not recolor */
    if (media || video) {
      gsap.fromTo(
        video || media,
        { scale: 1.14 },
        {
          scale: 1.04,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }

    /*
      Lighting evolution only:
      denser burnt copper → softer metallic sheen.
      Video texture preserved (no heavy recolor filters).
    */
    if (light) {
      light.style.setProperty("--paint-sheen", "0");

      gsap.fromTo(
        light,
        { opacity: 0.95 },
        {
          opacity: 0.32,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            end: "bottom 20%",
            scrub: true,
          },
        }
      );

      const sheenProxy = { v: 0 };
      gsap.to(sheenProxy, {
        v: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          end: "bottom 30%",
          scrub: true,
        },
        onUpdate: () => {
          light.style.setProperty("--paint-sheen", String(sheenProxy.v));
        },
      });
    }

    if (video) {
      ScrollTrigger.create({
        trigger: section,
        start: "top 85%",
        end: "bottom 15%",
        onEnter: () => video.play().catch(() => {}),
        onEnterBack: () => video.play().catch(() => {}),
        onLeave: () => video.pause(),
        onLeaveBack: () => video.pause(),
      });
    }
  };

  /* =========================================================
     SECTION 10 — Carbon: texture + desktop specular only
     ========================================================= */
  const initCarbon = () => {
    const section = document.getElementById("carbon");
    if (!section) return;

    const copyEls = section.querySelectorAll("[data-carbon-copy]");
    const video = document.getElementById("carbonVideo");
    const specular = document.getElementById("carbonSpecular");

    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: 1.05,
        stagger: 0.09,
        ease: "power4.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    if (video) {
      gsap.fromTo(
        video,
        { scale: 1.1 },
        {
          scale: 1.02,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );

      ScrollTrigger.create({
        trigger: section,
        start: "top 85%",
        end: "bottom 15%",
        onEnter: () => video.play().catch(() => {}),
        onEnterBack: () => video.play().catch(() => {}),
        onLeave: () => video.pause(),
        onLeaveBack: () => video.pause(),
      });
    }

    /*
      Desktop-only: extremely subtle specular following pointer.
      Soft light on carbon weave — not a cursor glow / spotlight.
    */
    if (specular && Motion.finePointer && !Motion.reduce) {
      section.classList.add("has-specular");
      let tx = 50;
      let ty = 45;
      let cx = 50;
      let cy = 45;
      let raf = 0;
      let active = false;

      const tick = () => {
        raf = 0;
        if (!active) return;
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        section.style.setProperty("--spec-x", `${cx}%`);
        section.style.setProperty("--spec-y", `${cy}%`);
        raf = requestAnimationFrame(tick);
      };

      section.addEventListener(
        "pointermove",
        (e) => {
          const r = section.getBoundingClientRect();
          if (!r.width || !r.height) return;
          tx = ((e.clientX - r.left) / r.width) * 100;
          ty = ((e.clientY - r.top) / r.height) * 100;
          if (!raf) raf = requestAnimationFrame(tick);
        },
        { passive: true }
      );

      section.addEventListener("pointerenter", () => {
        active = true;
        if (!raf) raf = requestAnimationFrame(tick);
      });

      section.addEventListener("pointerleave", () => {
        active = false;
        tx = 50;
        ty = 45;
        if (!raf) raf = requestAnimationFrame(tick);
      });
    }

    if (specular && (!Motion.finePointer || Motion.reduce)) {
      specular.style.display = "none";
    }
  };

  /* =========================================================
     SECTION 11 — Craft: door panel video + progressive words
     ========================================================= */
  const initCraft = () => {
    const section = document.getElementById("craft");
    if (!section) return;

    const copyEls = section.querySelectorAll("[data-craft-copy]");
    const callouts = section.querySelectorAll("[data-craft-callout]");
    const video = document.getElementById("craftVideo");

    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: 1.05,
        stagger: 0.1,
        ease: "power4.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    /*
      Progressive material words as the cinematic detail holds.
      Staggered through the section scroll — no boxes.
    */
    if (callouts.length) {
      const order = ["leather", "carbon", "metal", "light"];
      const sorted = order
        .map((key) => section.querySelector(`[data-craft-key="${key}"]`))
        .filter(Boolean);

      gsap.set(sorted.length ? sorted : callouts, { opacity: 0, y: 12 });

      gsap.to(sorted.length ? sorted : callouts, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        stagger: 0.22,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 55%",
          end: "top 15%",
          scrub: false,
          toggleActions: "play none none none",
          once: true,
        },
      });

      /* Hairlines draw slightly after each word settles */
      (sorted.length ? sorted : Array.from(callouts)).forEach((el, i) => {
        const line = el.querySelector(".craft-callout-line");
        if (!line) return;
        gsap.fromTo(
          line,
          { scaleX: 0 },
          {
            scaleX: 1,
            transformOrigin: el.classList.contains("craft-callout--carbon") ||
              el.classList.contains("craft-callout--light")
              ? "right center"
              : "left center",
            duration: 0.7,
            ease: "power2.out",
            delay: 0.15 + i * 0.22,
            scrollTrigger: {
              trigger: section,
              start: "top 55%",
              toggleActions: "play none none none",
              once: true,
            },
          }
        );
      });
    }

    if (video) {
      gsap.fromTo(
        video,
        { scale: 1.1 },
        {
          scale: 1.02,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );

      ScrollTrigger.create({
        trigger: section,
        start: "top 85%",
        end: "bottom 15%",
        onEnter: () => video.play().catch(() => {}),
        onEnterBack: () => video.play().catch(() => {}),
        onLeave: () => video.pause(),
        onLeaveBack: () => video.pause(),
      });
    }
  };

  /* =========================================================
     SECTION 12 — Seat: asymmetric editorial + soft parallax
     ========================================================= */
  const initSeat = () => {
    const section = document.getElementById("seat");
    if (!section) return;

    const copyEls = section.querySelectorAll("[data-seat-copy]");
    const media = document.getElementById("seatMedia");
    const main = section.querySelector('[data-seat-parallax="main"]');
    const back = section.querySelector('[data-seat-parallax="back"]');
    const front = section.querySelector('[data-seat-parallax="front"]');
    const img = section.querySelector(".seat-img");

    gsap.fromTo(
      copyEls,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 1.05,
        stagger: 0.09,
        ease: "power4.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );

    if (media) {
      gsap.fromTo(
        media,
        { opacity: 0.55, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: section,
            start: "top 75%",
            toggleActions: "play none none none",
            once: true,
          },
        }
      );
    }

    /* Extremely subtle layered parallax — craft, not spectacle */
    if (main) {
      gsap.fromTo(
        main,
        { yPercent: 4 },
        {
          yPercent: -3,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }

    if (back) {
      gsap.fromTo(
        back,
        { yPercent: 6 },
        {
          yPercent: -2,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }

    if (front) {
      gsap.fromTo(
        front,
        { yPercent: 1 },
        {
          yPercent: 4,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }

    if (img) {
      gsap.fromTo(
        img,
        { scale: 1.08 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 90%",
            end: "bottom 40%",
            scrub: true,
          },
        }
      );
    }
  };

  /* =========================================================
     SECTION 13 — Cockpit: pinned four-state cabin story
     ========================================================= */
  const initCockpit = () => {
    const pin = document.getElementById("cockpitPin");
    const image = document.getElementById("cockpitImage");
    if (!pin || !image) return;

    const copy = pin.querySelector("[data-cockpit-copy]");
    const cockpitStage = pin.querySelector(".cockpit-stage");
    const dayCopy = pin.querySelector("[data-night-day-copy]");
    const states = Array.from(pin.querySelectorAll("[data-cockpit-state]"));
    const indices = Array.from(pin.querySelectorAll("[data-cockpit-index]"));
    const existing = ScrollTrigger.getById("cockpitStory");
    if (existing) existing.kill();

    gsap.set(image, { scale: 1, transformOrigin: "center center" });
    gsap.set(states, { opacity: 0 });
    if (cockpitStage) gsap.set(cockpitStage, { opacity: 1 });
    if (copy) gsap.set(copy, { opacity: 1, y: 0 });
    if (dayCopy) gsap.set(dayCopy, { opacity: 0, y: 10 });
    if (indices.length) {
      gsap.set(indices, { color: "rgba(237, 232, 223, 0.28)" });
      gsap.set(indices[0], { color: "#e0c99a" });
    }

    const timeline = gsap.timeline({
      scrollTrigger: {
        id: "cockpitStory",
        trigger: document.getElementById("cockpit") || pin,
        start: "top top",
        end: () => `+=${window.innerHeight * 1.7}`,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    timeline.to(image, { scale: 1.05, duration: 1, ease: "none" }, 0);

    if (copy) {
      timeline.to(copy, { opacity: 0, y: -12, duration: 0.1, ease: "power1.in" }, 0.1);
    }

    if (states[0]) {
      timeline
        .to(states[0], { opacity: 1, duration: 0.06, ease: "none" }, 0.24)
        .to(states[0], { opacity: 0, duration: 0.06, ease: "none" }, 0.38);
    }

    if (states[1]) {
      timeline
        .to(states[1], { opacity: 1, duration: 0.06, ease: "none" }, 0.46)
        .to(states[1], { opacity: 0, duration: 0.06, ease: "none" }, 0.59);
    }

    if (states[2]) {
      timeline.to(states[2], { opacity: 1, duration: 0.06, ease: "none" }, 0.68);
    }

    if (indices.length === 4) {
      const dim = "rgba(237, 232, 223, 0.28)";
      const active = "#e0c99a";
      timeline
        .to(indices[0], { color: dim, duration: 0.04, ease: "none" }, 0.22)
        .to(indices[1], { color: active, duration: 0.04, ease: "none" }, 0.22)
        .to(indices[1], { color: dim, duration: 0.04, ease: "none" }, 0.44)
        .to(indices[2], { color: active, duration: 0.04, ease: "none" }, 0.44)
        .to(indices[2], { color: dim, duration: 0.04, ease: "none" }, 0.66)
        .to(indices[3], { color: active, duration: 0.04, ease: "none" }, 0.66);
    }

    if (cockpitStage) {
      timeline.to(cockpitStage, { opacity: 0, duration: 0.08, ease: "none" }, 0.82);
    }

    if (states[2]) {
      timeline.to(states[2], { opacity: 0, duration: 0.06, ease: "none" }, 0.82);
    }

    if (dayCopy) {
      timeline.to(dayCopy, { opacity: 1, y: 0, duration: 0.08, ease: "power2.out" }, 0.9);
    }
  };

  /* =========================================================
     SECTION 14 — After dark: day-to-night cabin transition
     ========================================================= */
  const initNight = () => {
    const section = document.getElementById("night");
    const pin = document.getElementById("cockpitPin");
    const night = document.getElementById("nightLayer");
    if (!section || !pin || !night) return;

    const ambient = document.getElementById("nightAmbient");
    const dayCopy = pin.querySelector("[data-night-day-copy]");
    const nightCopy = pin.querySelector("[data-night-copy]");
    const existing = ScrollTrigger.getById("nightTransition");
    if (existing) existing.kill();

    gsap.set(night, { opacity: 0 });
    if (ambient) gsap.set(ambient, { opacity: 0 });
    if (nightCopy) gsap.set(nightCopy, { opacity: 0, y: 18 });

    const settle = { progress: 0 };
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: "nightTransition",
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    if (dayCopy) {
      timeline.to(dayCopy, { opacity: 0, y: -10, duration: 0.12, ease: "power1.in" }, 0.2);
    }

    /* The daylight frame remains opaque underneath; night progressively covers it. */
    timeline.to(night, { opacity: 1, duration: 0.55, ease: "none" }, 0.28);

    if (ambient) {
      timeline.to(ambient, { opacity: 1, duration: 0.43, ease: "power1.inOut" }, 0.4);
    }

    if (nightCopy) {
      timeline.to(nightCopy, { opacity: 1, y: 0, duration: 0.17, ease: "power2.out" }, 0.72);
    }

    timeline.to(settle, { progress: 1, duration: 0.17, ease: "none" }, 0.83);
  };

  /* =========================================================
     SECTION 15 — Rear signature: light-first identity reveal
     ========================================================= */
  const initRearSignature = () => {
    const section = document.getElementById("rear-signature");
    const pin = document.getElementById("rearSignaturePin");
    const body = document.getElementById("rearSignatureBody");
    const light = document.getElementById("rearSignatureLight");
    const road = document.getElementById("rearSignatureRoad");
    const darkness = document.getElementById("rearSignatureDarkness");
    if (!section || !pin || !body || !light || !road || !darkness) return;

    const copy = pin.querySelector("[data-rear-signature-copy]");
    const edition = pin.querySelector("[data-rear-signature-edition]");
    const existing = ScrollTrigger.getById("rearSignatureStory");
    if (existing) existing.kill();

    gsap.set(body, { scale: 1.018, filter: "brightness(0.16) saturate(0.72)" });
    gsap.set(light, { opacity: 1 });
    gsap.set(road, { opacity: 0 });
    gsap.set(darkness, { opacity: 1 });
    if (copy) gsap.set(copy, { opacity: 0, y: 18 });
    if (edition) gsap.set(edition, { opacity: 0, y: 14 });

    const settle = { progress: 0 };
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: "rearSignatureStory",
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    timeline
      .to(darkness, { opacity: 0.52, duration: 0.42, ease: "none" }, 0)
      .to(body, { filter: "brightness(0.58) saturate(0.88)", duration: 0.58, ease: "none" }, 0.12)
      .to(darkness, { opacity: 0.2, duration: 0.32, ease: "none" }, 0.42)
      .to(body, { scale: 1, filter: "brightness(0.82) saturate(0.96)", duration: 0.36, ease: "none" }, 0.56)
      .to(road, { opacity: 0.74, duration: 0.3, ease: "none" }, 0.58);

    if (copy) {
      timeline.to(copy, { opacity: 1, y: 0, duration: 0.16, ease: "power2.out" }, 0.68);
    }

    if (edition) {
      timeline.to(edition, { opacity: 1, y: 0, duration: 0.14, ease: "power2.out" }, 0.76);
    }

    timeline.to(settle, { progress: 1, duration: 0.12, ease: "none" }, 0.88);
  };

  /* =========================================================
     SECTION 16 — Rear aerodynamics: quiet underbody flow
     ========================================================= */
  const initRearAerodynamics = () => {
    const section = document.getElementById("rear-aerodynamics");
    const pin = document.getElementById("rearAeroPin");
    const image = document.getElementById("rearAeroImage");
    if (!section || !pin || !image) return;

    const copy = pin.querySelector("[data-rear-aero-copy]");
    const edition = pin.querySelector("[data-rear-aero-edition]");
    const flows = Array.from(pin.querySelectorAll("[data-rear-flow]"));
    const labels = Array.from(pin.querySelectorAll("[data-rear-aero-label]"));
    const existing = ScrollTrigger.getById("rearAerodynamicsStory");
    if (existing) existing.kill();

    gsap.set(image, { scale: 1.025, transformOrigin: "56% 72%" });
    if (copy) gsap.set(copy, { opacity: 0, y: 18 });
    if (edition) gsap.set(edition, { opacity: 0, y: 14 });
    gsap.set(flows, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 });
    gsap.set(labels, { opacity: 0, y: 6 });

    const settle = { progress: 0 };
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: "rearAerodynamicsStory",
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    timeline.to(image, { scale: 1, duration: 1, ease: "none" }, 0);

    if (copy) {
      timeline.to(copy, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, 0.08);
    }

    if (flows.length) {
      timeline.to(
        flows,
        { strokeDashoffset: 0, opacity: 0.22, duration: 0.55, stagger: 0.045, ease: "none" },
        0.28
      );
    }

    if (labels.length) {
      timeline.to(
        labels,
        { opacity: 0.62, y: 0, duration: 0.16, stagger: 0.055, ease: "power1.out" },
        0.5
      );
    }

    if (edition) {
      timeline.to(edition, { opacity: 1, y: 0, duration: 0.14, ease: "power2.out" }, 0.72);
    }

    timeline.to(settle, { progress: 1, duration: 0.14, ease: "none" }, 0.86);
  };

  /* =========================================================
     SECTIONS 17 + 18 — one reversible, scroll-scrubbed video story
     ========================================================= */
  const initFinalVideoStory = () => {
    const section = document.getElementById("open-road");
    const pin = document.getElementById("finalStoryPin");
    const drone = document.getElementById("openRoadVideo");
    const rear = document.getElementById("finalRearVideo");
    if (!section || !pin || !drone || !rear) return;

    const journeyCopy = pin.querySelector("[data-open-road-copy]");
    const finalContent = pin.querySelector("[data-final-cta-content]");
    const existing = ScrollTrigger.getById("finalVideoStory");
    if (existing) existing.kill();

    [drone, rear].forEach((video) => {
      video.muted = true;
      video.pause();
      video.removeAttribute("autoplay");
    });

    gsap.set(drone, { opacity: 1 });
    gsap.set(rear, { opacity: 0 });
    if (journeyCopy) gsap.set(journeyCopy, { opacity: 0, y: 18 });
    if (finalContent) gsap.set(finalContent, { opacity: 0, y: 18, pointerEvents: "none" });

    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const mapProgress = (progress, start, end) => clamp01((progress - start) / (end - start));

    /*
      A seek controller never stacks stale seeks. While one seek is in flight,
      only the newest requested time is retained and serviced after `seeked`.
    */
    const createSeekController = (video) => {
      let requestedTime = 0;
      let seekPending = false;
      let unlockTimer = 0;

      const clampTime = (time) => {
        const duration = video.duration || 0;
        if (!duration) return 0;
        return Math.max(0, Math.min(duration - 0.001, time));
      };

      const flush = () => {
        if (!video.duration || seekPending || video.seeking) return;

        const next = clampTime(requestedTime);
        if (Math.abs(video.currentTime - next) < 0.012) return;

        seekPending = true;
        try {
          video.currentTime = next;
        } catch (_) {
          seekPending = false;
          return;
        }

        window.clearTimeout(unlockTimer);
        unlockTimer = window.setTimeout(() => {
          seekPending = false;
          flush();
        }, 240);
      };

      const onSeeked = () => {
        window.clearTimeout(unlockTimer);
        seekPending = false;
        if (Math.abs(video.currentTime - clampTime(requestedTime)) >= 0.012) flush();
      };
      video.addEventListener("seeked", onSeeked);

      return {
        request(time) {
          requestedTime = clampTime(time);
          flush();
        },
      };
    };

    let storyBuilt = false;

    const buildStory = () => {
      if (storyBuilt || !drone.duration || !rear.duration) return;
      if (!Number.isFinite(drone.duration) || !Number.isFinite(rear.duration)) return;
      storyBuilt = true;

      const droneSeek = createSeekController(drone);
      const rearSeek = createSeekController(rear);
      const settle = { progress: 0 };

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "finalVideoStory",
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const progress = self.progress;
            drone.pause();
            rear.pause();
            droneSeek.request(mapProgress(progress, 0, 0.57) * drone.duration);
            rearSeek.request(mapProgress(progress, 0.58, 0.94) * rear.duration);
            if (finalContent) {
              finalContent.style.pointerEvents = progress >= 0.78 ? "auto" : "none";
            }
          },
        },
      });

      if (journeyCopy) {
        timeline
          .to(journeyCopy, { opacity: 1, y: 0, duration: 0.1, ease: "power2.out" }, 0.08)
          .to(journeyCopy, { opacity: 0, y: -12, duration: 0.1, ease: "power1.in" }, 0.44);
      }

      /* Overlapping opacity ramps create the drone/cockpit → rear dissolve. */
      timeline
        .to(rear, { opacity: 1, duration: 0.12 }, 0.54)
        .to(drone, { opacity: 0, duration: 0.1 }, 0.58);

      if (finalContent) {
        timeline.to(finalContent, { opacity: 1, y: 0, duration: 0.08, ease: "power2.out" }, 0.72);
      }

      timeline.to(settle, { progress: 1, duration: 0.12 }, 0.88);

      droneSeek.request(0);
      rearSeek.request(0);
      requestAnimationFrame(() => Motion.refresh());
    };

    const onMetadata = () => buildStory();
    drone.addEventListener("loadedmetadata", onMetadata, { once: true });
    rear.addEventListener("loadedmetadata", onMetadata, { once: true });

    if (drone.readyState < 1) drone.load();
    if (rear.readyState < 1) rear.load();
    buildStory();

  };

  initSilhouette();
  initAirflow();
  initXray();
  initExploded();
  initEnergy();
  initDrive();
  initBrakesWheelsSlide();
  initBrakes();
  initWheels();
  initPaint();
  initCarbon();
  initCraft();
  initSeat();
  initCockpit();
  initNight();
  initRearSignature();
  initRearAerodynamics();
  initFinalVideoStory();
  wireFutureSections();

  /* One layout settle after all ScrollTriggers exist */
  requestAnimationFrame(() => {
    Motion.refresh();
  });

  window.addEventListener("load", () => {
    Motion.refresh();
  });
})();
