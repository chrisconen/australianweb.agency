// Reproduces the per-section clip mapping from index.html against real geometry.
// Fails if a section's clip does not run from its first frame to its last across
// exactly that section's scroll, or if progress ever reverses.
const N = 8, VH = 1080, SECTION = 1.8 * VH, FOOTER = 220;
const tops = Array.from({ length: N }, (_, i) => i * SECTION);
const docHeight = N * SECTION + FOOTER;
const maxScroll = docHeight - VH;

function frame(y) {
  let idx = 0, local = 0;
  for (let i = 0; i < N; i++) {
    const p = (y - tops[i]) / SECTION;
    if (p >= 0) { idx = i; local = Math.min(1, p); }
  }
  if (idx === N - 1) {
    const reach = (maxScroll - tops[N - 1]) / SECTION;
    if (reach > 0) local = Math.min(1, local / reach);
  }
  return { idx, local };
}

let fail = 0;
const bad = m => { console.error("FAIL: " + m); fail++; };

// every clip starts at zero when its section arrives
for (let i = 0; i < N; i++) {
  const f = frame(tops[i] + 1);
  if (f.idx !== i) bad(`section ${i} not active at its own top`);
  if (f.local > 0.01) bad(`clip ${i} does not start from its first frame`);
}

// every clip reaches its last frame before handing over
for (let i = 0; i < N - 1; i++) {
  const f = frame(tops[i + 1] - 1);
  if (f.idx !== i) bad(`section ${i} handed over early`);
  if (f.local < 0.99) bad(`clip ${i} only reaches ${(f.local * 100).toFixed(1)}% of its length`);
}

// the closing clip must reach its end at the bottom of the page — the bug that once
// left the crocodile mid-shot
const end = frame(maxScroll);
if (end.idx !== N - 1) bad("bottom of page is not on the last section");
if (Math.abs(end.local - 1) > 0.001) bad(`closing clip stops at ${(end.local * 100).toFixed(1)}%`);

// progress never reverses
let prev = -1;
for (let y = 0; y <= maxScroll; y += 15) {
  const f = frame(y);
  const t = f.idx + f.local;
  if (t < prev - 1e-9) bad("progress reversed at y=" + y);
  prev = t;
}

console.log(fail ? `${fail} failure(s)` : `ok — ${N} clips, each scrubbed start to end across its own section`);
process.exit(fail ? 1 : 0);
