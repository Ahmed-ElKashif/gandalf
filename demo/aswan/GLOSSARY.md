# GLOSSARY — the Al Madina demo terms

Recorded per `grill-with-docs` during the acceptance test of the station
skills (`celebrimbor` → `galadriel` → `haldir` → `legolas`). Facts marked
**confirmed** were confirmed by the operator in the intake session; anything
not in evidence this session is recorded as *not in evidence* — the page
honours that, and so must any later edit.

| Term | Meaning |
|---|---|
| **The operator** | The owner of the Al Madina brand, speaking through the intake session. Not a repo member; their data comes over the board or the listing. |
| **Al Madina Coal & Shawarma** | *Confirmed.* The business the demo presents. A charcoal-grill and shawarma house in Aswan, Egypt. Its literal Arabic rendering is **المدينة للفحم والشاورما** — a direct translation, recorded as such; the operator's own signage always overrides it. |
| **The mark** | The operator's provided logo (`assets/al-madina-logo.jpg`): a crimson field, a white wave with three grill balls above it, a thick gold crescent and a scatter of gold dots. Sampled evidence: red `#B31A1C`, gold `#F5B553`, white shapes `#FFFFFF`. |
| **Board** | The operator's physical menu board — the only price authority for the real restaurant. The page's menu section **is a picture of that fact**, not a transcript of a menu nobody can verify. Prices, if ever transcribed, are EGP. |
| **Menu transcription rule** | *Confirmed as the demo's rule.* Only items that are confidently readable go on the page, and this session there are zero of those — the menu photos from the intake session are not in evidence. So the page names only what the business's own name guarantees: shawarma, and what the coal (الشاورما والفحم) serves, marked as exactly that. Everything else: the board. |
| **The four states** | Empty / loading / error / long content — declared in galadriel's `states.md`, one line each, before the build. On a static page with no fetch, the first three are declared N/A with their reasons; long content is real and verified. |
| **The listing** | The business's public gallery on Google Maps. Source of the scene photographs was considered and rejected here: the photos on this page come from Wikimedia Commons instead, with licences recorded — see `assets/credits.json`. |
| **A likeness** | The two dish photographs (foul medames, koshary) are CC-licensed pictures of Egyptian *dishes* — **not** photographs of the operator's plates. They may be shown as cultural context only, and every caption must say so. |
| **The gallery** | The unequal band of Aswan scene photographs (sections "The city" / "The river"). Full-bleed or flex-grow unequal widths, per the composed direction. |
| **The demo banner** | The chip in the page's top-left stating this is an acceptance test of the station skills — not the operator's official website. The operator confirmed the demo framing; the banner is how the page honours it. |
| **The tool file** | The WebMCP tool file galadriel authors (`index.html`'s gated registration script) — currently one tool, `photos.list`, whose live output the `qa` round compares against the DOM. `qa` never edits it. |
