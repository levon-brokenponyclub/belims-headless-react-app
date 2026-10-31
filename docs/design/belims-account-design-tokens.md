# Belims account dashboard design tokens

This proposal reuses the existing `index.css` and `tailwind.config.js` system; it does not introduce a component library or new font.

| Role | Token / value | Use |
|---|---|---|
| Brand blue | `--color-belims-blue` / `rgb(50, 39, 131)` | Account rail, strong outlines, active navigation |
| Action red | `--color-primary` / `#c4301c` | Primary checkout-adjacent or key action only |
| Ink | `--color-text` / `#000` | Headings, critical numeric data |
| Secondary text | `--color-text-secondary` / `#4d4d4d` | Supporting copy |
| Canvas / raised | `#fff` | Main page and cards |
| Soft surface | `#f5f5f5` / `#eeecec` | Metadata, inactive navigation |
| Border | `#e5e5e5` | Dividers and card boundaries |
| Success | `#27923b` | Completed / in-stock confirmation |
| Warning | `#bd6b1b` | Pending / action-needed status |
| Error | `#c4301c` | Failed/cancelled/error status |
| Info | `#175CD3` | Processing/shipping information |

## Type and spacing

- Family: Archivo, system-ui fallback; headings use 700 and body uses 400–600.
- H1 36px / 1.15; H2 30px / 1.2; H3 24px / 1.25; body 15px / 1.6; metadata 11px / 1.5.
- Account mockups use a 4px scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 60.
- Use concise uppercase labels only for metadata and section eyes, not paragraphs.

## Surfaces, controls and state

- Industrial surfaces use white fills, 1px neutral borders, 2–6px corners, and no decorative gradients.
- Card elevation is optional (`0 4px 10px rgba(0,0,0,.12)`) and reserved for active/raised content.
- Primary button: Belims red, white 700 text, 48px minimum height. Secondary: white with 2px blue outline. Tertiary: textual blue action.
- Inputs: 48px height, 1px border, persistent visible label, 4px corner.
- Status badges always include the textual status. Completed/success green; processing/shipped blue; pending/on-hold amber; cancelled/failed/error red; refunded neutral.
- Focus: 3px blue outer ring with 2px offset on every interactive control. Motion is limited to 150ms opacity/colour transitions and disabled by `prefers-reduced-motion`.

## Layout

- Content max: 1380px with 16px narrow-screen and 48px wide-screen padding.
- Breakpoints: 640, 768, 1024, 1280, 1536px.
- Desktop: navigation rail is 264–288px. Option C content grid shifts from 1 column to 8/4 at `xl`.
- Touch targets: 44px minimum where feasible.

## Accessibility guardrails

Use semantic nav/main/section landmarks, one H1 per view, buttons for in-page actions, links for destinations, `aria-current="page"` for active navigation, readable contrast, and no colour-only status communication.
