# Storybook · learnandplay.ai
State as of 2026-10-29: Live in production at https://learnandplay.ai/storybook/ and pushed to GitHub at https://github.com/clementfarabet/storybook. Backend microservice running on clmt.ai.

## Latest
- App starts from a clean, blank book (`pages: []`), opening immediately into the Creative Studio.
- Added page deletion with gentle confirmation modal, automatic renumbering, and fallback to Studio.
- Made typed text a first-class creation mode alongside voice narration with live sync and idea starters.
- Replaced footer AI mentions with standard LearnX disclaimer: *"Disclaimer: These projects are built for fun — take all AI-generated results and syntheses with a grain of salt."*
- Calibrated 4 age brackets (Toddler, Early Reader, Middle Grade, YA & Adult) adapting vocabulary and cadence.
- Implemented visual theme selector & freeform creator with full book retheming (capped at 10 pages).
- IndexedDB client storage engine (`storybook_db`) handles multi-megabyte illustrations without quota errors.

## Run, test, ship
- GitHub Repository: https://github.com/clementfarabet/storybook
- Dev frontend: `npm run dev` (Vite on http://localhost:5175/)
- Backend server: `npm run server` (Node on http://127.0.0.1:8794/)
- Typecheck: `npx tsc --noEmit` (0 errors)
- Fixed story generation parse error by explicitly configuring `thinking_level: 'low'`, `response_format: { type: 'text', mime_type: 'application/json' }`, increasing token ceiling to 4096, and adding multi-stage resilient JSON parsing fallbacks.
- Automated tests: `npm test` (7/7 tests passing)
- Production build: `npm run build` (dist/ bundled in ~1.0s)
- Production deploy: `npm run deploy` (syncs to clmt.ai:/var/www/learnandplay/storybook)
- Live URL: https://learnandplay.ai/storybook/

## Where things are
- `src/App.tsx`: Main view controller, state persistence, retheming orchestration, inline editable author/title.
- `src/components/NarrationStudio.tsx`: Voice recording studio, live transcription, double-click latching, audio visualizer.
- `src/components/BookSpread.tsx`: Hardcover book spread with gutter fold shadow, Read Aloud TTS, and inline text editing.
- `src/components/ThemeSelector.tsx`: Preset themes, freeform theme generator, client-side keyword validation.
- `src/components/PdfExportModal.tsx`: Print-ready square PDF generator with download triggering.
- `src/components/ErrorBoundary.tsx`: React error boundary preventing white screens.
- `src/utils/storage.ts`: IndexedDB persistence with schema self-healing (`sanitizeStoryBook`).
- `src/utils/pdfExport.ts`: jsPDF vector and canvas rasterizer with text normalization.
- `server/storybookServer.mjs`: Node microservice handling transcription, age prose calibration, image generation, and TTS.
- `tests/hardening.test.mjs`: Automated regression test suite for storage self-healing, prompt injection, and PDF text.

## Remote Production Architecture
- Host: `clmt.ai` (Debian Linux, nginx 1.22, systemd, Node.js 20)
- Web Root: `/var/www/learnandplay/storybook/`
- API Backend: `/opt/storybook-api/storybookServer.mjs` running via `storybook-api.service` on `127.0.0.1:8794`
- Environment & API Keys: `/etc/polisatlas-api.env`
- Reverse Proxy: `/etc/nginx/sites-available/learnandplay.ai` proxying `/storybook/api/` -> `127.0.0.1:8794`

## Decisions
- Native IndexedDB over localStorage: Prevents `QuotaExceededError` from multi-megabyte base64 PNG illustrations.
- Square Book Format (210×210 mm): Matches traditional children's picture books and prints seamlessly.
- Positive Prompt Phrasing: Diffusion models attend to text when negative words are used; use "Pure visual storytelling, wordless picture spread" instead.
- Tokenized clmt-style Design: Uses `--paper`, `--ink`, `--accent` (#6d28d9) and unified `lp_theme` in localStorage to share dark/light mode across learnandplay.ai apps.

## Next
- Verify feedback from real users creating stories on phones and tablets.
- Optional: Add multilingual narrator voices via `gemini-3.8-flash-tts` voice selection.
