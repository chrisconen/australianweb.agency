# AWA Signal redesign — October 2026

The 17 agency pages share a graphite, chalk and orange visual system, with a new editorial homepage and three custom generated artworks. Existing standalone demo projects keep their own design. The homepage free-store promotion follows the services section; the real AI readiness tool remains available in its own section and in the footer.

## Offer and content

The user explicitly confirmed **A$999 one-time setup + GST**, with A$0 Neocart base software. Hosting, domain and external provider fees are separate. The setup includes the first 20 supplied products and the agreed launch configuration. Custom platform projects and the founding-client programme are separate offers. Hypothetical calculator hosting/domain values are not published tariffs.

New routes: `free-online-store.html`, `journal.html`, `free-online-store-explained.html`, `free-online-store-costs.html`, `start-a-free-online-store.html`. Three original Australian-English guides use the topics of CONEN Digital's latest free-store articles as editorial starting points. Each credits its source and links to the other guides and the campaign.

## Maintain the source

- Edit `signal.css` for the shared visual layer; `_tools/build.py` inlines it after each page's existing styles.
- Edit `_tools/commerce_pages.py` for the campaign, journal index, metadata and recommendation renderer.
- Edit `_tools/journal/*.html` for article prose. Reading times and contents are generated from this source.
- Edit `_tools/services/online-stores.json` for the ecommerce service copy. The custom platform packages remain separately priced in `_tools/service_page.py`.
- Run `python _tools/build.py` after source changes. All 17 pages get static recommendations immediately before the footer; an article excludes itself.
- Image-generation prompts and final asset paths are in `docs/signal-artwork.md`.

## Verification

Serve the project on port 8766 (`python -m http.server 8766 --bind 127.0.0.1`) and run `python _tools/verify_redesign.py`. The audit covers all 17 agency pages at 320, 390, 768, 1024 and 1440px, links, anchors, structured-data parsing, local images, navigation, calculator edge cases, article contents, brief prefill, simulated API failure, all 54 archive cards and their filters, preview dismissal, no-JavaScript navigation and reduced motion. Local reports and screenshots stay in ignored `.tmp/`.

## Boundaries and existing changes

- The pre-existing local deletions under `clips/` are excluded from this release. The audit reads the committed `clips/lucius-burger.webp` into a local response fixture when needed, without restoring or changing the user's deleted file. Production continues to deploy the committed asset.
- The brief form, API Worker, analytics and existing demo internals retain their original contracts. Tests intercept the brief failure response; no test enquiry is sent and no real payment is attempted.
- The calculator and illustrative product selector operate only in the browser and store no data. The sample products are not a live checkout.
- New image and font dependencies are local. Static content remains readable without JavaScript. Reduced-motion users see no hero entrance animation.
- The Neocart planner is an external Hungarian-language tool, explicitly labelled. The AWA planning process is English; storefront language is agreed in writing.
- Future content edits must preserve the distinction between free software and paid setup/operation, and must update the generator rather than editing generated campaign HTML alone.

## Release verification

The full local regression audit passed on 19 October 2026: 17 agency pages, five viewport widths, all checks listed above. The build was repeated with identical HTML hashes. Review findings for button/contact contrast, dark CTA copy, no-JavaScript navigation, archive mobile layout, currency accessibility labels and the archive menu breakpoint were corrected. JavaScript syntax checks passed for `awa.js`, `commerce.js` and `studio.js`.

Production is the existing GitHub Pages legacy build from `main` at the repository root, with `australianweb.agency` as its configured domain. This release does not migrate hosting or redeploy the API Worker.
