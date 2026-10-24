# DESIGN-REFERENCE

The UI/UX source of truth for Funded. Start here for any screen, component or style work. It describes the app as built after the full-app redesign (#377), derived from the redesign design doc and checked against `src/app/globals.css` and `src/components/ui/`. Where this file and the code disagree, the code wins: fix this file.

Page-by-page layout lives in the design doc (private artifact, https://claude.ai/artifact/WSUDn3pfUNTdDHcQXTwK7x, start at `project/README.md`). Vocabulary lives in `docs/context/`.

## Brand and tone

Funded is a household bills and goals app, installed on a phone (iPhone first). Made by Hazardous Schematics, so it borrows that brand's rounded shapes but keeps Funded's own dark, lime look.

Feels: dark, technical, clean, minimal but bold, lime used where it matters. Rounded and friendly, never childish.

Never: glow, neon haze, glass blur, gradients on lists, dotted or slashed zeros, hover-only effects, springs or bounce.

## Colour

Tokens are CSS custom properties in `src/app/globals.css`, mapped to Tailwind via `@theme inline`. Dark is the default; light follows the system or the Settings choice (`.dark` / `.light` class on `<html>`).

| Role | Token | Dark | Light |
|------|-------|------|-------|
| Page | `background` | `#0a0a0a` | `#f2f2ee` |
| Card | `surface` | `#111111` | `#e8e8e4` |
| Raised (buttons, circles, nav) | `surface-raised` | `#181818` | `#dcdcd8` |
| Elevated | `surface-elevated` | `#202020` | `#d0d0cc` |
| Text | `foreground` | `#f0f0f0` | `#0f0f0f` |
| Secondary text | `muted` | `#999999` | `#444444` |
| Hint text | `subtle` | `#858585` | `#5c5c5c` |
| Accent (lime) | `primary` | `#c8ff00` | `#7aaa00` |
| Warning (amber) | `accent` | `#ffab00` | `#c07800` |
| Error / destructive (red) | `destructive` | `#ff3d57` | `#cc2233` |
| Success (green) | `success` | `#00e676` | `#00994a` |
| Hairline | `border` / `border-strong` | white 7% / 12% | black 9% / 15% |

- Text on a lime, amber or dark fill uses `*-fg` (black; white on light-theme red).
- **Coloured text uses the `text-primary-ink`, `text-accent-ink`, `text-success-ink`, `text-destructive-ink` utilities**, never `text-primary` etc. The ink values are the same as the fill in dark and darker in light, so text reaches 4.5:1 on the page and card surfaces in both themes. Fills, borders and rings use the plain colours. A test (`designTokens.test.mjs`) enforces this.
- Light-theme limits: lime, amber and green fills as *text* fail contrast on light grounds, which is why the ink tokens exist. On the deepest light surface (`surface-elevated`) hint and red text fall just under 4.5:1; avoid putting them there.

## Typography

Both fonts load through `next/font/google`.

| Font | Variable | Use |
|------|----------|-----|
| Syne (400–800) | `--font-heading` | The page-header `h1` only (and the Welcome, Setup hub, sign-in titles) |
| Instrument Sans (400–700) | `--font-body` | Everything else, including every number |

Numbers use tabular figures with a plain zero (set on `body`). No monospace font. Inputs are 16px minimum (stops iOS zoom). Body text 15–16px; labels and captions 12–14px.

## Shape, spacing and layout

- Radii: pills and circles `rounded-full`; cards and panels `rounded-card` (16px); pop-up sheets `rounded-sheet` (28px); inputs `rounded-input` (12px). Inner radius = outer radius minus the padding between them.
- Screen side margin 16px. Max content width 480.
- Floating nav: `--nav-height` 66px, `--nav-bottom` clears the iPhone safe area, `--nav-clearance` is what pages and docked cards must clear. Never hard-code these.
- Depth comes from surface steps and 1px hairlines, with one soft shadow on the nav. No stacked shadows.

## Components

Built in `src/components/ui/`; reuse before inventing.

- **Button.** Primary: lime pill, black 16px semibold label, 44px minimum height, 24px side padding. Ghost: raised-surface pill with a strong hairline. Destructive text is red. Disabled: 50% opacity. Content-sized by default; full width only for the one main action on a form or an irreversible last step; action and Cancel sit side by side.
- **IconCircle / BackCircle / CloseCircle.** 36px circle in a 44px tap area, 1px border, raised fill. Back circles only on drill-down screens. Pop-ups carry a circle X.
- **Chip.** 36px pill for filters and choices; selected state is a lime ring or fill.
- **Card.** 16px radius on `surface`.
- **Input / Select / Textarea / Field.** 12px radius, 16px text, label above, red line below on error.
- **Row.** Tappable list row, tints on press (never scales). `tall` variant for two-line rows. Opens a sheet or navigates.
- **Dialog** (centre, bottom, confirm placements) and **DetailSheet** (rows; tap a row to edit only that field), **SingleCard** (one question, one save pill), **ConfirmDialog** (short red action word, e.g. Delete). No native `confirm()`.
- **StepFlow** for add flows: one question per card, Next pill above the keyboard, optional Skip, summary last, Discard box if quit after typing. Slide 32px between cards.
- **Carousel.** Native scroll-snap, dots, optional auto-rotate with a pause button. Used on Dashboard and Payday.
- **ProgressRing**, **Toast** (bottom, with Undo where the action is reversible), **BottomNav** (4 slots, 2px lime ring on the current page, slides in 300ms, fades while the keyboard is open).
- **Empty, loading and error states.** Empty: one plain sentence plus the single next action. Loading: render nothing until data is read, so no flash of the wrong state. Error: one red line beneath the action that failed, plus a retry where it makes sense; never a native alert.

## Motion

- Enter `cubic-bezier(.22,.31,0,1)`, exit `cubic-bezier(.69,0,0,1)`. Slow in, fast out.
- Durations: `--duration-quick` 150ms, `--duration-feedback` 300ms, `--duration-structural` 550ms. Use the tokens, never raw numbers.
- Press: `.press` scales to 0.97 instantly and eases back; rows and cards use `.press-tint`.
- **iOS rule:** lime fills appear on `:active` only, never hover or focus, so nothing sticks after a tap. Keyboard focus shows the lime outline ring.
- **Reduce Motion:** state still changes but nothing slides or scales; sheets fade, carousels swap instantly.

## Accessibility and performance floors

- 44px tap targets. Text 4.5:1 against its ground in both themes (see Colour).
- Never colour alone: overdue, paid and warning states also carry text or an icon.
- Every row reads once to VoiceOver; icon-only buttons have labels.
- Funded is a mobile app: design and check at 375px on iPhone; code must still work on Android.
- Performance limits and hard invariants live in `SPEC.md` Part A.

## Reference material

Hazardous Schematics (`hazardous-schematics-website/02-DESIGN-REFERENCE.html`): take the pill buttons, circles and rounded cards. Cartel (`cartel/02-DESIGN-REFERENCE.html`): take the floating nav and press behaviour, not its warm light palette.

## Do / don't

Do: reuse `ui/` components; use tokens for colour, radius, motion and nav space; keep lime for the one thing that matters on a screen; write copy in plain sentence case ("goal", not "fund"); show a toast with Undo for reversible taps.

Don't: add a new font; hard-code hex colours, pixel radii, durations or nav offsets; put lime on hover; use `text-primary`-style plain colours for text; open native `confirm()` or `alert()`; add glow, blur or gradients; make a control smaller than 44px to tap; add a new screen layout without checking the design doc.
