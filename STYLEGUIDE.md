# Towncrier Style Guide

This guide captures visual and interaction standards derived from `design.html` and aligned with the MVP and stateless constraints (no accounts, no storage).

## Design Tokens

### Colors
- Primary: `#137fec`
- Background (Light): `#f6f7f8`
- Background (Dark): `#101922`
- Surface Light: `#ffffff`
- Surface Dark: `#0f172a` (approx Tailwind slate-900)
- Text Primary Light: `#0f172a` (slate-900)
- Text Primary Dark: `#f8fafc` (slate-50)
- Text Secondary Light: `#64748b` (slate-500)
- Text Secondary Dark: `#94a3b8` (slate-400)
- Borders Light: `#e2e8f0` (slate-200)
- Borders Dark: `#1f2937` (slate-800)
- Status Colors (map/legend)
  - Retraction: `#ef4444` (red-500)
  - Correction: `#f59e0b` (amber-500)
  - Original: `#22c55e` (green-500)
  - Inciting highlight: blue outline using Primary `#137fec`

### Typography
- Font Family: Inter, sans-serif
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- Base size: 16px
- Scale (Tailwind):
  - xs 12px, sm 14px, base 16px, lg 18px, xl 20px
  - 2xl 24px, 3xl 30px, 4xl 36px (use sparingly)

### Radius
- Default 4px, lg 8px, xl 12px, full 9999px

### Spacing (Tailwind scale)
- 4px grid: 4, 8, 12, 16, 20, 24, 32, 40 px
- Common paddings: 8–16 px; panel gutters 16 px; sidebars 16 px

### Elevation
- Use subtle shadows for floating elements (dropdowns, tooltips).
- Prefer border + subtle background over heavy shadows for panels.

## Core Layout
- App shell: three-column layout
  - Left sidebar: filters (max-width ~ 384px)
  - Center: map canvas (fills remaining)
  - Right sidebar: details (max-width ~ 384px)
- Full viewport height, overflow-y auto in sidebars.
- Dark mode via `class="dark"` on `html`.

## Components

### Inputs
- Use Tailwind Forms plugin styles as shown in `design.html`.
- Focus state: `focus:ring-2 focus:ring-primary/50`.
- Corner radii: rounded-lg for primary input groups.

### Buttons
- Primary: background `#137fec`, text white, hover `bg-primary/90`, height 40px, radius 8px, medium/bold.
- Destructive: use red-500 with the same sizing; only when needed.
- Ghost/secondary: transparent background, text primary, subtle hover.

### Accordions
- Use native `<details>/<summary>` with border separators.
- Chevron rotates `group-open:rotate-180`.

### Sidebars
- Light: `bg-white` with `border-slate-200`
- Dark: `bg-slate-900/50` with `border-slate-800`

### Map Markers & Legend
- Colors align with status colors above.
- Shapes for color-blind accessibility:
  - Retraction: circle
  - Correction: square/diamond
  - Original: triangle
  - Inciting: outline ring in Primary
- Legend includes color, shape, and counts; ensure text contrast AA.

### Detail Panel
- Empty state icon and guidance text centered.
- Active state shows title, summary, metadata, timeline events, and links.

## Accessibility
- Keyboard: All interactive controls reachable via Tab, visible focus ring.
- Contrast: Minimum 4.5:1 for body text, 3:1 for large text and UI elements.
- Reduced motion: avoid excessive animations; provide CSS `prefers-reduced-motion` compatibility.
- ARIA: labels for icons, buttons, and legends. Use `aria-expanded` where applicable.

## Interaction States
- Hover: subtle background tint or underline for links; buttons `bg-primary/90`.
- Active: slight scale or inset shadow is acceptable; avoid large motion.
- Disabled: lower opacity and disable pointer events.
- Loading: skeletons for map/timeline; progress bar for search.

## Theming
- Light/dark via class switch on root; ensure all text/border tokens have dark variants.
- Do not persist theme: keep stateless. Optionally read `prefers-color-scheme` only.

## Content Guidelines
- Titles: sentence case.
- Labels: concise; prefer nouns over verbs in filter labels.
- Tooltips: brief, single sentence.

## Do/Don't
- Do keep panels simple with clear hierarchy.
- Do use consistent spacing from this guide.
- Don’t rely on color alone; use shapes/labels.
- Don’t introduce custom fonts beyond Inter without need.

## Code Snippet (Tailwind Setup)
Reference from `design.html`:

```html
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<script>
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        colors: {
          primary: "#137fec",
          "background-light": "#f6f7f8",
          "background-dark": "#101922",
        },
        fontFamily: { display: ["Inter"] },
        borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      },
    },
  }
</script>
```

## Open Questions
- Marker shape set: confirm final shapes per status.
- Map cluster styles: define palette for cluster counts.
- Detail panel timeline icons/colors (align with status colors).
