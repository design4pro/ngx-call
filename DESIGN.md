# ngx-call Demo Design Standard

## Intent

The demo is both the public website and the live playground for `ngx-call`. It should make one idea clear: Angular UI can be invoked and awaited like a function while the rendered component keeps ownership of the interaction.

## Design Read

This is a developer-facing Angular landing page with documentation density, live examples, and a modern custom component-system feel. The target direction uses Angular v22 color identity and a compact documentation-first structure.

## References

- `https://angular.dev/`: Angular v22 color language, gradient identity, dark neutral text, and framework-first confidence.

## Design Principles

- Lead with the product state. The first viewport must show the library name, the awaitable Angular promise, the install command, and a live callable preview.
- Use Angular's modern palette: dark neutral text, red, pink, violet, and blue gradient accents. Avoid drifting back to generic Google blue.
- Keep the interface dense enough for developers to scan. This is documentation and playground UI, not a generic SaaS splash page.
- Preserve behavior. Visual changes must not remove examples, change callable names, or break `<ngx-call-host>` wiring.
- Do not reference third-party UI libraries unless the dependency is actually installed and used by the demo.

## Foundations

### Color Roles

- Text: Angular dark neutral, modeled after `oklch(0.1937 0.006 300.98)`.
- Primary: Angular blue-violet `oklch(0.5101 0.274 263.83)` for active controls, focus, and resolved state.
- Gradient accent: Angular red `#DD0031`, pink `#B81B7F`, and primary blue-violet.
- Danger: `#B42318` for friction and error examples.
- Neutral surfaces: `#FBFBFE`, `#F5F3FB`, and `#EEEAF8` for layered interface surfaces.
- Borders: soft violet-neutral lines rather than heavy card outlines.

### Type

- Use the system sans stack through Tailwind's `--font-sans` theme token.
- Keep hero typography bold and compact. The hero headline should stay at two lines on desktop.
- Preserve monospace code samples with the Tailwind `--font-mono` token.

### Layout

- Content width is capped at `1240px`.
- Horizontal page padding is responsive: `clamp(20px, 5vw, 64px)`.
- Radius defaults to 8px for compact, consistent controls.
- Hero, examples, explanation, stack demo, and CTA must each use a distinct layout family.

## Components

- Buttons use clear command text, strong focus states, and consistent 48px primary height.
- The primary CTA uses the Angular gradient. Secondary CTAs stay neutral with visible borders.
- Filter chips behave like segmented controls. Active state uses primary color plus border/background changes.
- Example cards are scannable: category, optional behavior tags, title, description, action.
- Dialog and overlay examples keep their existing callable behavior and shared class contract.
- Code comparison panels should stay horizontally scannable on desktop and stack on mobile.

## Accessibility

- Keyboard focus must remain visible with a 3px primary focus ring.
- Color is never the only state indicator. Active chips and selected swatches also use border, background, or outline changes.
- Motion respects `prefers-reduced-motion`.
- Responsive breakpoints must preserve content order and keep controls reachable on small screens.
- CTA labels must stay readable against gradient or neutral backgrounds.

## Tailwind Implementation

- Tailwind CSS v4 is configured through the official Angular/PostCSS path.
- `projects/demo/src/styles.css` owns the Tailwind import, theme tokens, base layer, and component layer.
- Use Tailwind-backed component classes for the public website surface.
- Keep component-specific inline styles only where the callable example owns a distinct overlay behavior.

## Verification Contract

Before shipping visual changes:

- Confirm the landing page still renders `ngx-call`, the install command, and `21 of 21 examples`.
- Confirm representative examples remain visible: Command palette, Image lightbox, and Mutation flow.
- Confirm all existing `ngx-call-host` elements remain mounted.
- Run demo tests, library tests, demo build, and library build.
