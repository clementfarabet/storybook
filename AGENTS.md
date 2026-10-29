Read RESUME.md first.

# Storybook Standing Rules

## Brand & Design System
- Maintain full design coherence with the learnandplay.ai family (`learnx`, `polisatlas`).
- House tokens: `--paper`, `--paper-2`, `--ink`, `--ink-2`, and accent violet `--accent: #6d28d9`.
- Typography: Newsreader serif for storybook content and headings; system sans for application chrome.
- Shared dark/light theme state synced via `localStorage.getItem('lp_theme')`.
- Phone and desk are distinct experiences; inspect both before showing any UI change.

## Safety & Content Standards
- Rule 8 Child Safety is paramount: all text and illustrations must remain wholesome, gentle, and positive.
- Never output weapons, violence, horror, or distress in stories or illustration prompts.
- Sanitize custom theme inputs and enforce length boundaries against prompt injection.
- Keep `GEMINI_API_KEY` on the server backend only; never log or leak into client bundles.

## PDF & Print Output
- Always maintain Children's Square Book format (210×210 mm / 8.5" × 8.5").
- Sanitize smart punctuation and non-ASCII characters to prevent jsPDF font encoding crashes.
- Rasterize SVGs and images to offscreen canvas before drawing to PDF.

## Operations & Deployments
- Deploy target: `clmt.ai:/var/www/learnandplay/storybook/`.
- Backend service: `storybook-api.service` (`/opt/storybook-api/`).
- Always run `npm test` and `npm run build` before deploying.
- Ask for explicit user confirmation before any live deploy, publish, or commit.
- Never delete files with `rm` or `unlink`; move to `~/.Trash/` if necessary.
