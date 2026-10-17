# AWA website redesign

The homepage and complete 54-project archive share a new editorial design: ink blue, lime, DM Sans and Instrument Serif. Australian English copy centres on clear positioning, direct access to Chris Conen and an individually scoped delivery process.

## Scope and assumptions

- AWA remains the existing independent, one-person studio. No offices, team members, client testimonials, awards or conversion results were invented.
- Existing project destinations and categories are retained. The collection is explicitly described as design concepts and technical explorations.
- The canonical enquiry address is info@australianweb.agency, consistent with agents.json and the old homepage contact link.
- Existing favicon and social image assets remain. Discovery copy and structured data reflect the updated offer.

## Verification

Checked HTML nesting, unique IDs, heading structure, all local media and anchor destinations, all 54 original demo URLs, category/filter coverage, JSON-LD and JavaScript syntax. Browser visual and interaction QA were not performed: not requested, and the connected browser is unavailable.

## Trust boundaries and failure modes

- The agency pages are static, with email contact links; there is no new form backend, storage, analytics or tracking.
- Google Fonts, conen.dev and the existing demo/CDN origins are external dependencies. System fallbacks, static poster images and normal project links remain usable when enhancements fail.
- Preview destinations are restricted to local /demos/ routes and https://conen.dev/work/. Full project links remain available without JavaScript, and a persistent new-tab link provides a way out of a failed embed.
- Existing local demos share the agency origin and are trusted site code. The iframe sandbox permits scripts and same-origin access because the demos require them. This is not a security boundary against malicious first-party demos; untrusted future projects should be hosted on a separate origin.
- A native dialog handles focus containment. Closing it unloads its iframe and returns focus. Hover previews are limited to one instance and disabled for touch, reduced motion and reduced data.
- The hero loads one video only when visible, respects reduced motion/data preferences and pauses in the background. A static image remains if autoplay or loading fails.

## Long-term maintenance

Shared studio.css and studio.js keep both pages consistent without build dependencies. Keep project totals, archive descriptions and llms.txt aligned when the collection changes. Timelines are agreed per project; no blanket delivery or performance guarantees are published.

The Sites preview is a compact publication snapshot of these exact pages and their assets. Its eight local demo directory routes redirect to the existing australianweb.agency demos. It does not replace the original repository or deploy to the agency's public domain.
