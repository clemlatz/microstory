---
name: Microstory
description: A calm, precise, self-hosted knowledge base for a writer's universe, read and edited like a lab notebook.
colors:
  bar: "#f0eee9"
  bar-dark: "#121212"
  canvas: "#faf9f5"
  ink: "#211f1b"
  body: "#453f38"
  muted: "#675f57"
  faint: "#6e6760"
  rule: "#e8e4db"
  field: "#f0ede4"
  accent: "oklch(0.55 0.12 40)"
  accent-ink: "#ffffff"
  danger: "oklch(0.5 0.15 30)"
  canvas-dark: "#1b1917"
  ink-dark: "#f3f0ea"
  body-dark: "#cbc5bb"
  muted-dark: "#c4beb4"
  rule-dark: "#2e2a26"
  field-dark: "#262220"
  accent-dark: "oklch(0.72 0.12 40)"
  accent-ink-dark: "#1b1917"
  danger-dark: "oklch(0.72 0.14 30)"
typography:
  title:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  item-name:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  ui:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.09em"
rounded:
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "6px 14px"
    height: "44px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.lg}"
    size: "44px"
  button-icon-hover:
    backgroundColor: "{colors.field}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
    height: "44px"
  list-item:
    textColor: "{colors.ink}"
    typography: "{typography.item-name}"
    padding: "10px 0"
  title-bar:
    backgroundColor: "{colors.bar}"
    textColor: "{colors.ink}"
    height: "56px"
    padding: "0 24px"
---

# Design System: Microstory

## 1. Overview

**Creative North Star: "The Lab Notebook"**

Microstory is a notebook for one writer's universe: ruled, quiet, exact. Content is the page; the interface is the ruling. Everything is separated by hairlines rather than boxes, labelled by small uppercase tags, and read in a serif that belongs to the writing rather than to the tool. Nothing performs. The system earns trust the way a good notebook does: by being the same on every page.

The density is low-to-medium and predictable: lists of entries with a name, a two-line excerpt, and discreet actions; a thin top bar; a collapsible navigation drawer. Color is almost absent, a warm paper canvas and tinted ink, with a single rust accent used only to say "this is the primary action". Dark mode follows the OS and keeps the same warmth (charcoal paper, cream ink), never a cold black.

The system explicitly rejects what PRODUCT.md rejects: generic SaaS (identical card grids, purple gradients, hero metrics), "magic" AI apps (sparkles, omnipresent chat, AI decoration), kitsch fantasy (parchment, medieval fonts, role-playing theming), and dense enterprise dashboards.

**Key Characteristics:**
- Warm paper canvas, tinted ink, one rust accent used sparingly.
- Hairline rules separate content; surfaces are flat.
- Serif for the writer's text and titles, humanist sans for labels and controls.
- Small uppercase tracked labels as section headings.
- Every interactive element has a 44px minimum target.
- State is shown quietly: a dot, a checkmark, a tonal hover.

## 2. Colors

A restrained paper-and-ink palette: warm-tinted neutrals carry almost everything, one rust accent carries action. All neutrals lean toward the same warm hue; there is no pure black or white on a surface.

### Primary
- **Rust Marker** (oklch(0.55 0.12 40) light, oklch(0.72 0.12 40) dark): the only accent. Used for the primary button fill and nothing decorative. Text on it is Paper White (#ffffff light) or Night Paper (#1b1917 dark).

### Neutral
- **Bar Tint** (#f0eee9, rgb 240,238,233; dark #121212, rgb 18,18,18): the top bar and the navigation drawer. Text keeps the theme's normal tokens; only the hover/active tint and the hairlines are re-declared on these surfaces (the `.surface-bar` class) so they stay visible against the bar.
- **Warm Paper** (#faf9f5; dark #1b1917): the page canvas.
- **Notebook Ink** (#211f1b; dark #f3f0ea): titles and entry names.
- **Body Ink** (#453f38; dark #cbc5bb): running text in the editor and excerpts.
- **Margin Gray** (#675f57; dark #c4beb4): secondary text, labels, icon buttons at rest.
- **Faint Pencil** (#6e6760; dark #b0aaa0): placeholders, counts, saved-state checkmark.
- **Ruled Line** (#e8e4db; dark #2e2a26): every divider, title bar bottom border, list separators.
- **Field Tint** (#f0ede4; dark #262220): input backgrounds and the hover tint of ghost buttons.
- **Correction Red** (oklch(0.5 0.15 30) light, oklch(0.72 0.14 30) dark): destructive actions and error messages only.

### Named Rules
**The One Marker Rule.** Rust appears on the primary action and nowhere else. If two rust elements share a screen, one is wrong.

**The No Cold Neutral Rule.** Never use Tailwind `gray-*`, `white`, or pure `#000`/`#fff` surfaces inside the app. Every neutral is one of the tokens above. 

## 3. Typography

**Title and Body Font:** Source Serif 4 (with Georgia, serif)
**UI and Label Font:** Source Sans 3 (with system-ui, sans-serif)

**Character:** The serif is the writer's voice (titles, excerpts, editor text); the sans is the tool's voice (labels, names in lists, buttons, errors). Together they read like a typeset notebook with printed tabs.

### Hierarchy
- **Title** (600, 16px, 1.5, -0.025em tracking): the entry or story title in the top bar, centered, truncated.
- **Item name** (500, 16px, 1.5): the name of an entry in a list, in the sans.
- **Body** (400, 14px, 1.625): excerpts and editor text, in the serif. Prose lines stay within 65–75ch.
- **UI** (400, 14px, 1.43): buttons, empty and error messages. Form fields and selects are the exception: always 16px, to prevent iOS focus zoom.
- **Label** (600, 12px, 0.09em tracking, uppercase): section headings above lists; paired with a 12px count in Faint Pencil.

### Named Rules
**The Two Voices Rule.** Serif is for content the writer owns; sans is for the tool. Never use serif on a button or sans in the editor body, and never introduce a display font.

**The Fixed Scale Rule.** Only four sizes exist: 12px (labels, counts, dates), 14px (UI, excerpts), 16px (titles, entry names, reading text) and 24px (page titles on the stories list and login). No arbitrary `text-[Npx]` values and never fluid `clamp()`. The app is a tool, not a poster.

## 4. Elevation

Flat by default. Depth is conveyed by hairline rules and tonal fills (Field Tint), not shadows. The only elevated surfaces are true overlays: the confirm dialog (a single soft shadow plus a 40% scrim) and the mobile navigation drawer (above a scrim). The top bar uses a faint translucent canvas (90%) with a small blur so scrolled content does not collide with it; that blur is functional, not decorative.

### Named Rules
**The Flat-By-Default Rule.** Surfaces at rest have no shadow. A shadow appears only on something that floats above the page (dialog, drawer).

## 5. Components

### Buttons
- **Shape:** gently rounded (6px) for text buttons; 8px for square icon buttons.
- **Primary:** Rust Marker fill, accent-ink text, 14px medium sans, 6px × 14px padding, 44px minimum height. Disabled drops to 50% opacity.
- **Icon / Ghost:** transparent, Margin Gray icon (20px, 1.8 stroke), 44px minimum square. Hover fills with Field Tint. Destructive icon buttons use Correction Red.
- **Hover / Focus:** hover is a tonal fill only, no lift, no shadow. Focus must show a visible ring.

### Inputs / Fields
- **Style:** Field Tint fill, no border, 6px radius, 44px minimum height, 16px sans text (below 16px, iOS Safari zooms the page on focus), Faint Pencil placeholder.
- **Title field:** the entry title in the top bar is a borderless, transparent input styled exactly like the plain title, so editing in place looks the same as reading.
- **Error:** a short line in Correction Red with `role="alert"` beneath the form.

### List Items
- **Style:** a row separated by a Ruled Line bottom border, no card, no background. Item name (sans, 16px) over a two-to-three-line serif excerpt in Margin Gray; per-row actions are icon buttons aligned right. The whole row is the click target (cmd/ctrl+click opens in a new tab).
- **Section header:** uppercase Label with the count right-aligned, underlined by a Ruled Line.

### Navigation
- **Top bar:** 56px, full window width, Bar Tint at 90% with a Ruled Line bottom border. Left: drawer toggle. Center: title (editable on entry pages). Right: on an entry page, a 44px trash button in Correction Red (opens the confirmation dialog); elsewhere an empty spacer that mirrors the toggle so the title stays centered. Save status sits right after the title.
- **Drawer:** Bar Tint surface; persistent sidebar on desktop; full-width overlay on narrow viewports. It slides horizontally in 200ms (ease-out) when opened or closed; the one exception to "motion conveys state only" is that this slide also moves the content area on desktop, where the sidebar width collapses with it. The top bar stays above it. Items use Notebook Ink at rest (never Margin Gray); the active item is marked by a tonal background and medium weight. While a character, note or documentation entry is open, its line in "Recently viewed" is the active item and its section is not (Notion-style). Item text is 18px below the `md` breakpoint (the only place outside the four-size scale, for tap comfort) and 14px above it. The footer holds the account and utility actions as labelled rows: my stories, download a backup, sign out, then the language selector.

### Save Status
Shown by the title color alone: Pending Orange (oklch(0.52 0.14 55) light, oklch(0.78 0.14 60) dark; at least 4.9:1 on the bar) while an entry has unsaved changes or is saving, Notebook Ink once saved. There is no dot or checkmark; a visually hidden `role="status"` element announces the state for screen readers.

### Editor (BlockNote)
Gutters and background are neutralized so text starts flush with the title's left edge, Notion-style, on the Warm Paper canvas.

## 6. Do's and Don'ts

### Do:
- **Do** keep the content first: the writer's text is the interface and the chrome recedes.
- **Do** separate content with Ruled Line hairlines (1px) rather than boxes or cards.
- **Do** use Rust Marker only for the primary action, once per screen.
- **Do** give every interactive element a 44px minimum target (`min-h-11`, `min-w-11`).
- **Do** show state quietly and always accessibly: dot, pulse, checkmark, with an `aria-label`.
- **Do** keep motion to 150–250ms, ease-out, and only to convey state; respect `prefers-reduced-motion`.
- **Do** use the CSS variables (`--reader-*`) for all colors so dark mode follows the OS automatically.
- **Do** leave room for French strings, which run longer than English.

### Don't:
- **Don't** build generic SaaS: no identical card grids, no purple gradients, no hero metrics.
- **Don't** add "magic" AI decoration: no sparkles, no omnipresent chat, no AI glow. The app calls no LLM.
- **Don't** go kitsch fantasy: no parchment textures, medieval or display fonts, role-playing-game theming.
- **Don't** make it a dense enterprise dashboard: no wall of tables and widgets.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe.
- **Don't** use gradient text, decorative glassmorphism, or shadows on resting surfaces.
- **Don't** use Tailwind `gray-*`, `red-*`, or pure white/black inside the app; use the Reader tokens.
- **Don't** use em dashes in UI copy.
