# MUSIC TOWN — visual iteration

Historical iteration notes. These entries describe their respective snapshots, not the current release status. See README.md for the current implementation and deployment checks. Real-device mobile QA is still pending.

final result: blocked

Latest iteration (2026-11-04): replaced fixed six-character selection with independently composited AI-generated base/hair/eyes/nose layers, plus separate colors. Added original MUSIC TOWN logo, generated environment sprites and grass, river bridge, Flaticon icons with in-app attribution, and paper-like menus with reduced corner rounding. Runtime asset composition is inspected through `tmp/qa/avatar-parts.png`; this does not substitute for browser UI QA. In-app browser still returns `The browser access host is unavailable`.

Reference: user-provided village screenshot, 600 × 338. The requested direction is a full-screen, gently elevated third-person park with a cute human avatar, greenery and discreet HUD.

Implemented: Three.js scene, perspective follow camera, rounded human character with animated limbs, soft shadows, music cottage, foliage, flower beds, river, wooden busking spots. Existing React/TypeScript/Tailwind application flows remain in place. The large introductory panel is hidden and the stage list is opened by a button. Clock and minimap sit in lower corners.

Verified: TypeScript compilation and Vite production build. Local HTTP response is checked separately; this is not visual verification.

Blocked: `cua.createBrowserTab("iab", ...)` returns `The browser access host is unavailable`. No current prototype screenshot, same-viewport comparison or real mobile performance test is available. Visual fidelity, occlusion, shadows and touch experience remain unverified. No claim of a design QA pass is made.

Remaining limitations: procedural original 3D models rather than production-quality art assets; no live networking/audio/auth. Mobile GPU performance and same-viewport fidelity need browser/device QA before release.

## 2026-11-05 browser verification
Orca embedded browser connection restored. Verified development preview -> avatar editor -> hair selection -> channel selection -> park entry. Inspected actual browser screenshots in tmp/qa/editor-browser.png and tmp/qa/park-fixed.png. Moved sign-out into header controls to avoid stage-label overlap, made editor confirmation sticky, and replaced removed PCFSoftShadowMap with PCFShadowMap. Production build passed. Real OAuth and multiplayer audio remain unconnected; this is partial UI verification, not production readiness. Mobile landscape and all customization variants still require broader UI coverage.

## Compact shared UI — 2026-11-05
Extracted Button, DialogPanel, Panel and PanelHeading. Shared tokens in src/components/ui/town-ui.css: 34px default actions, 8px button radius, 12px panels, cream/leaf palette. Converted active main, login, avatar and part-option buttons. Build passed. Actual Orca browser screenshots inspected: tmp/qa/compact-editor.png and compact-channels.png; editor confirmation now fits the captured viewport and channel transition works. Full mobile device matrix remains unverified.

## 2026-11-10 coffee menu and profile refinement

final result: blocked

Target: user-supplied printed coffee menu reference (740 × 513), adapted to the existing four-drink ordering dialog. Source assets retained: the four local coffee illustrations. Implemented cream paper color, brown serif English headings, restrained dotted dividers, compact selection marks, and a single-column menu with two columns for short landscape viewports. Selection and ordering callbacks remain intact.

Verification limitation: Node REPL browser execution tools are not exposed in this session after tool discovery. No current implementation screenshot or same-state visual comparison is available. Typography, spacing, responsive fit, image cropping, and interaction appearance remain visually unverified; build checks do not constitute visual QA. Prior browser results above apply only to their historical snapshots.
