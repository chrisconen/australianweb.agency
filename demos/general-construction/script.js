const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-button");
const mobileNav = document.querySelector(".mobile-nav");
const mobileLinks = document.querySelectorAll(".mobile-nav a");
const timelineStory = document.querySelector(".timeline-story");
const timelineVideos = [...document.querySelectorAll(".timeline-video")];
const timelinePhases = [...document.querySelectorAll(".timeline-progress .phase")];
const timelineHeading = document.querySelector(".timeline-title h2");
const timelineDuration = document.querySelector(".timeline-title > span");
const timelineCounter = document.querySelector(".timeline-counter span");
const timelineContent = [
  { title: "Foundations.", duration: "2–4 WEEKS" },
  { title: "Structure.", duration: "8–14 WEEKS" },
  { title: "Services & fit-out.", duration: "10–18 WEEKS" },
  { title: "Handover.", duration: "1–2 WEEKS" },
];
const videoDuration = 6;
const videoFrameRate = 24;
const videoScrubTargets = new WeakMap();
let activeTimelineIndex = 0;
let scrubFrame = 0;
let timelineMediaLoaded = false;

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
}, { passive: true });

function closeMenu() {
  document.body.classList.remove("menu-open");
  mobileNav.classList.remove("is-open");
  mobileNav.setAttribute("aria-hidden", "true");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open menu");
}

menuButton.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("is-open");
  document.body.classList.toggle("menu-open", isOpen);
  mobileNav.setAttribute("aria-hidden", String(!isOpen));
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

mobileLinks.forEach((link) => link.addEventListener("click", closeMenu));

function setTimelineProgress(index, progress) {
  timelinePhases[index].style.setProperty("--phase-progress", Math.min(progress, 100) + "%");
}

function activateTimelinePhase(index) {
  if (index < 0 || index >= timelineVideos.length) return;

  timelineVideos.forEach((video, videoIndex) => {
    video.pause();
    video.classList.toggle("is-active", videoIndex === index);
  });

  activeTimelineIndex = index;
  timelineHeading.textContent = timelineContent[index].title;
  timelineDuration.textContent = timelineContent[index].duration;
  timelineCounter.textContent = String(index + 1).padStart(2, "0");
}

function commitVideoSeek(video) {
  const targetTime = videoScrubTargets.get(video);
  const halfFrame = 1 / (videoFrameRate * 2);
  if (
    targetTime === undefined ||
    video.readyState < 1 ||
    video.seeking ||
    Math.abs(video.currentTime - targetTime) <= halfFrame
  ) {
    return;
  }

  video.currentTime = targetTime;
}

function seekVideo(video, time) {
  const targetTime = Math.min(videoDuration, Math.max(0, time));
  const frameTime = Math.round(targetTime * videoFrameRate) / videoFrameRate;
  videoScrubTargets.set(video, frameTime);

  if (video.readyState >= 1) {
    commitVideoSeek(video);
  } else {
    video.dataset.scrubTime = String(frameTime);
  }
}

function syncTimelineToScroll() {
  scrubFrame = 0;
  const rect = timelineStory.getBoundingClientRect();
  const viewportHeight = Math.max(window.innerHeight, 1);
  const scrubDistance = Math.max(rect.height - viewportHeight, 1);
  const localScroll = Math.min(scrubDistance, Math.max(0, -rect.top));
  const totalProgress = localScroll / scrubDistance;
  const scaledProgress = totalProgress * timelineVideos.length;
  const nextIndex = Math.min(
    timelineVideos.length - 1,
    Math.floor(scaledProgress)
  );
  const segmentProgress = totalProgress >= 1 ? 1 : scaledProgress - nextIndex;

  if (nextIndex !== activeTimelineIndex) activateTimelinePhase(nextIndex);

  timelineVideos.forEach((video, index) => {
    video.pause();
    if (index === nextIndex) seekVideo(video, segmentProgress * videoDuration);
  });

  timelinePhases.forEach((phase, index) => {
    const progress = index < nextIndex ? 100 : index === nextIndex ? segmentProgress * 100 : 0;
    phase.classList.toggle("is-active", index === nextIndex);
    phase.classList.toggle("is-complete", index < nextIndex);
    setTimelineProgress(index, progress);
  });
}

function requestTimelineSync() {
  if (scrubFrame) return;
  scrubFrame = requestAnimationFrame(syncTimelineToScroll);
}

function loadTimelineMedia() {
  if (timelineMediaLoaded) return;
  timelineMediaLoaded = true;

  timelineVideos.forEach((video) => {
    const source = video.querySelector("source[data-src]");
    if (!source) return;
    if (video.dataset.poster) {
      video.poster = video.dataset.poster;
      video.removeAttribute("data-poster");
    }
    source.src = source.dataset.src;
    source.removeAttribute("data-src");
    video.preload = "auto";
    video.load();
  });
}

timelineVideos.forEach((video) => {
  video.pause();
  video.addEventListener("seeked", () => commitVideoSeek(video));
  video.addEventListener("loadedmetadata", () => {
    if (video.dataset.scrubTime) {
      seekVideo(video, Number(video.dataset.scrubTime));
      delete video.dataset.scrubTime;
    }
  });
});

window.addEventListener("scroll", requestTimelineSync, { passive: true });
window.addEventListener("resize", requestTimelineSync);
activateTimelinePhase(0);
syncTimelineToScroll();

if ("IntersectionObserver" in window) {
  const timelineLoadObserver = new IntersectionObserver((entries, observer) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    loadTimelineMedia();
    observer.disconnect();
  }, { rootMargin: "75% 0px" });
  timelineLoadObserver.observe(timelineStory);
} else {
  loadTimelineMedia();
}

const tourStory = document.querySelector(".tour-story");
const tourLine = document.querySelector(".tour-line");
const tourTitle = document.querySelector("[data-tour-text]");
const tourAction = document.querySelector(".tour-action-mask");
const tourOpenButton = document.querySelector("[data-tour-open]");
const tourModal = document.querySelector("[data-tour-modal]");
const tourCloseButton = document.querySelector("[data-tour-close]");
const tourModalVideo = tourModal.querySelector("video");
const tourModalSource = tourModalVideo.querySelector("source[data-src]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let tourUnits = [];
let tourFrame = 0;

tourTitle.dataset.tourText.split(" ").forEach((word) => {
  const wordElement = document.createElement("span");
  wordElement.className = "tour-word";
  wordElement.setAttribute("aria-hidden", "true");

  [...word].forEach((character) => {
    const mask = document.createElement("span");
    const glyph = document.createElement("span");
    mask.className = "tour-letter";
    mask.dataset.tourUnit = "";
    glyph.className = "tour-glyph tour-unit-inner";
    glyph.textContent = character;
    mask.append(glyph);
    wordElement.append(mask);
  });

  tourTitle.append(wordElement);
});

tourUnits = [...document.querySelectorAll("[data-tour-unit]")];

function fitTourTitle() {
  const lineStyle = getComputedStyle(tourLine);
  const isColumn = lineStyle.flexDirection === "column";
  const gap = Number.parseFloat(isColumn ? lineStyle.rowGap : lineStyle.columnGap) || 0;
  const availableWidth = isColumn
    ? tourLine.clientWidth
    : tourLine.clientWidth - tourAction.offsetWidth - gap;

  tourTitle.style.fontSize = "100px";
  const naturalWidth = Math.max(tourTitle.getBoundingClientRect().width, 1);
  const fittedSize = Math.max(1, (availableWidth / naturalWidth) * 100);
  tourTitle.style.fontSize = fittedSize.toFixed(2) + "px";
}

function setTourProgress(progress) {
  const unitSpan = 1.5;
  const scaledProgress = progress * (tourUnits.length - 1 + unitSpan);

  tourUnits.forEach((unit, index) => {
    const localProgress = Math.min(1, Math.max(0, (scaledProgress - index) / unitSpan));
    const eased = 1 - Math.pow(1 - localProgress, 3);
    const inner = unit.querySelector(".tour-unit-inner");
    inner.style.transform = "translate3d(0, " + ((1 - eased) * 115) + "%, 0)";
  });

  const isComplete = progress >= 0.999;
  tourStory.classList.toggle("is-complete", isComplete);
  tourOpenButton.disabled = !isComplete;
}

function syncTourToScroll() {
  tourFrame = 0;
  const rect = tourStory.getBoundingClientRect();
  const viewportHeight = Math.max(window.innerHeight, 1);
  const pinTop = viewportHeight * 0.5;
  const travel = Math.max(rect.height - pinTop, 1);
  const scrollProgress = Math.min(1, Math.max(0, (pinTop - rect.top) / travel));
  const renderedProgress = reducedMotion.matches && scrollProgress > 0 ? 1 : scrollProgress;
  setTourProgress(renderedProgress);
}

function requestTourSync() {
  if (tourFrame) return;
  tourFrame = requestAnimationFrame(syncTourToScroll);
}

function closeTourModal() {
  tourModalVideo.pause();
  document.body.classList.remove("tour-modal-open");
  if (tourModal.open) tourModal.close();
}

tourOpenButton.addEventListener("click", () => {
  if (tourModalSource?.dataset.src) {
    tourModalSource.src = tourModalSource.dataset.src;
    tourModalSource.removeAttribute("data-src");
    tourModalVideo.load();
  }
  document.body.classList.add("tour-modal-open");
  tourModal.showModal();
  tourModalVideo.currentTime = 0;
  tourModalVideo.play().catch(() => {});
});

tourCloseButton.addEventListener("click", closeTourModal);
tourModal.addEventListener("click", (event) => {
  if (event.target === tourModal) closeTourModal();
});
tourModal.addEventListener("close", () => {
  tourModalVideo.pause();
  document.body.classList.remove("tour-modal-open");
});

window.addEventListener("scroll", requestTourSync, { passive: true });
window.addEventListener("resize", () => {
  fitTourTitle();
  requestTourSync();
});
reducedMotion.addEventListener("change", requestTourSync);
fitTourTitle();
document.fonts?.ready.then(() => {
  fitTourTitle();
  requestTourSync();
});
setTourProgress(0);
syncTourToScroll();

const numberObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    const target = entry.target;
    const end = Number(target.dataset.count);
    const decimals = String(end).includes(".") ? 1 : 0;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / 900, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      target.textContent = (end * eased).toFixed(decimals);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    observer.unobserve(target);
  });
}, { threshold: 0.45 });

document.querySelectorAll("[data-count]").forEach((number) => numberObserver.observe(number));

const navLinks = document.querySelectorAll(".desktop-nav a");
const sections = document.querySelectorAll("main section[id]");
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
    });
  });
}, { rootMargin: "-42% 0px -50% 0px" });

sections.forEach((section) => sectionObserver.observe(section));
