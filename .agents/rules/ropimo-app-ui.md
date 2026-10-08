---
description: Ropimo app UI system. Applies to everything inside the logged-in product.
globs: app/app/**/*.tsx,components/app/**/*.tsx
alwaysApply: false
---

# Ropimo product UI rules

The app is a dense, calm, fast work tool. It is NOT the marketing site. Same brand family (font, cream, black), different job.

## Tokens
- Canvas (behind everything, sidebar sits on it): #F6F4EC
- Surface (main content sheet): #FFFFFF
- Hairline: #E9E6DA
- Hover row/item: #F4F2EA, Selected item: #ECE9DD
- Text primary #111, secondary #6B6B6B, tertiary #9A9A9A
- Primary button: black #111, white text. No other filled colors for buttons.
- Status colors ONLY as a 6px dot + plain text (green #1F9D55 done/active, amber #D99A00 in progress, red #D93025 overdue, gray #9A9A9A none). Never filled pills.
- Brand accents (green #7ED08A, yellow #FFE76A, peach #FFCFC2, blue #3B63F0, orange #FF6B3D) are allowed ONLY for: avatars, project/department color dots, calendar events, charts.

## Type
- Same font as the website. Sizes: 13px body (default), 12px secondary/meta, 14px emphasis, 20px page title, 24px for key numbers.
- Weights: 400, 500, 600 only. Never 700 or 800 inside the app. Tracking -0.01em on titles, 0 elsewhere.
- tabular-nums on every number. Sentence case everywhere. NO uppercase tracked micro-labels.

## Shape
- Only two radii: 8px (buttons, inputs, menu items, chips) and 12px (the main sheet, popovers, drawers). No rounded-2xl/3xl, no rounded-full except avatars and dots.
- Heights: buttons/inputs 32px, table rows 40-44px, sidebar items 30px, topbar 48px.
- Borders: hairlines BETWEEN things (row dividers, section dividers). Do not wrap everything in a bordered card. Max ONE container level: never a box inside a box.
- Shadows: none, except popovers, dropdowns, and the side peek panel.
- Icons: lucide-react, 16px, strokeWidth 1.5, color secondary gray. NEVER inside colored squares or circles. No sparkle icons anywhere.

## Layout patterns
- Page header: title 20px/600 (+ item count in tertiary gray), right side has ONE primary button and optional ghost buttons. No icon tile. No subtitle unless it explains something non-obvious.
- Lists and collections are TABLES/ROWS with hairline dividers, never grids of cards.
- Row actions appear on hover. Primary action is clicking the row.
- Detail views open in a right side panel (peek, 480px) before navigating to a full page. Not centered modals.
- Empty states: ONE muted line plus ONE text action, inline where the content would be (e.g. "No upcoming events. Schedule one"). No illustrations, no big icons, no "All caught up" blocks. If a section has nothing to show and nothing to do, hide the section.

## Anti-AI rules
- No gradients, glow, glassmorphism, sparkles, emoji, "👋".
- No row of identical stat tiles. No pill on every row. No repeated placeholder text in every row (use "-" and reveal the action on hover).
- Copy is short and specific. Never "Welcome back!", "Unlock", "Supercharge", "Seamless", "Powerful".
- Realistic data in any seed or demo content.

## Speed
- Server Components by default. Client components only for interaction.
- Every route has a loading.tsx with a skeleton shaped like the final layout. No full-page spinners.
- Mutations are optimistic (instant UI, rollback on error).
- Use next/link prefetch. Debounce search 200ms. Virtualize lists over 100 rows.
- Motion: 120ms ease-out, only for hover, focus, popover/drawer open, and a new row appearing. No page transitions, no staggers, no loops.

## Keyboard
- Cmd/Ctrl+K command palette, C create, / focus search, J/K move in lists, Enter open, Esc close. Show shortcuts as small gray hints in menus and tooltips.
