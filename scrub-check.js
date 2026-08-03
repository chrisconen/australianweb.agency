// Reproduces measure()'s section mapping against the page's real geometry.
// Fails if scrolling to the bottom does not land on the end of the last shot.
const MARKS = ["00:09:00","00:12:00","00:15:00","00:18:00","00:21:00","00:24:00","00:27:00","00:30:10"]
  .map(s => { const [m,sec,f] = s.split(":").map(Number); return m*60+sec+f/25; });
const T = [0, ...MARKS.slice(0,7)], T_END = MARKS;

function timeAt(y, geo) {
  const { max, tops, heights } = geo, last = tops.length - 1;
  let idx = 0, local = 0;
  for (let i = 0; i < tops.length; i++) {
    const p = (y - tops[i]) / heights[i];
    if (p >= 0) { idx = i; local = Math.min(1, p); }
  }
  if (idx === last) {
    const reach = (max - tops[last]) / heights[last];
    if (reach > 0) local = Math.min(1, local / reach);
  }
  return T[idx] + (T_END[idx] - T[idx]) * local;
}

// 1080p viewport, 180vh sections, 100vh sticky pin, ~220px footer
const vh = 1080, H = 1.8 * vh, N = 8, footer = 220;
const tops = Array.from({length: N}, (_, i) => i * H);
const geo = { tops, heights: Array(N).fill(H), max: N * H + footer - vh };

const end = timeAt(geo.max, geo);
console.log("bottom of page -> t =", end.toFixed(3), "(want 30.400)");
if (Math.abs(end - 30.4) > 0.01) { console.error("FAIL: closing shot cut short"); process.exit(1); }

// monotonic and covers every mark
let prev = -1;
for (let y = 0; y <= geo.max; y += 20) {
  const t = timeAt(y, geo);
  if (t < prev - 1e-9) { console.error("FAIL: time went backwards at y=" + y); process.exit(1); }
  prev = t;
}
console.log("monotonic across the whole scroll: ok");
