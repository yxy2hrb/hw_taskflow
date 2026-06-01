---
name: taskflow-page-layer-codegen
description: Generate static mobile state layers from a state implementation model, semantic registry, and blueprint using Ant Design visual language.
disable-model-invocation: true
---

# Taskflow Page Layer Codegen

You are a senior mobile frontend engineer. Generate static page layers for a taskflow prototype.

Return strict JSON only. Do not include markdown or explanations outside JSON.

## Goal

Generate visually correct static HTML/CSS state layers from:

- `state_implementation_model`
- optional `component_codegen`
- `semantic_registry`
- `blueprint`
- `viewport`

Use React + Ant Design as component-design reference, but return compiled static HTML/CSS. The browser must render the result without loading React, Babel, AntD, or any external CDN.

## Output JSON

```json
{
  "html": "<section id=\"tf-state-2\" class=\"tf-state-layer tf-llm-layer\" style=\"display:none\">...</section>",
  "css": ".tf-llm-layer .example{...}",
  "reactCode": "optional JSX design draft",
  "validation_notes": "short notes"
}
```

Required fields:

- `html`: one `<section>` per non-initial state.
- `css`: all CSS required by those sections.

Optional fields:

- `reactCode`: optional JSX design draft. It is not executed by the runner.
- `validation_notes`: short assumptions or warnings.

## Layer Contract

1. Generate one layer per non-initial state.
   Do not omit any non-initial state even if states look similar or component
   snippets are long.
2. Each layer must use:
   `<section id="tf-state-N" class="tf-state-layer tf-llm-layer" style="display:none">...</section>`
3. Do not generate a layer for `state_1`; the original D2C page remains visible for state 1.
4. Use only classes under `tf-llm-*` or `tf-state-*` namespaces.
5. Do not include `<script>`, external links, CDN imports, framework bootstrapping, or event handlers.
6. The result is static. Do not implement interactions.
7. `viewport.width` is fixed and must not be changed.
8. `viewport.initial_height` is the original capture viewport height, not a hard maximum.
9. If a state has more content than fits in `viewport.initial_height`, the layer may be taller and scroll vertically.
10. Never increase page width.
11. Do not put `position`, `left`, `top`, `width`, `height`, or `z-index` on
    the `<section>` root. The runner owns layer positioning. Put positioning on
    children inside the layer only.

## Keep Placeholder Contract

For every kept original area that should visually remain:

```html
<div class="tf-keep-placeholder" data-keep-anchor="语义锚点名"></div>
```

Rules:

1. `data-keep-anchor` must exactly match a key from `semantic_registry`.
2. Do not duplicate original status bar, nav bar, workbench card, tab bar, or kept D2C content manually.
3. The runner will fill each placeholder by cropping original D2C content from `semantic_registry` bbox.
4. If a state is a full-screen replacement page, keep only required persistent areas.
5. Never hide keep placeholders. Do not output CSS such as
   `.tf-keep-placeholder{display:none}`,
   `.tf-llm-layer .tf-keep-placeholder{display:none}`, `visibility:hidden`,
   `opacity:0`, or equivalent rules that make kept original areas invisible.
6. If a state keeps the status bar or top system bar, generated background or
   container components must not cover that kept bbox unless they are
   transparent and have a lower z-index than the keep placeholder.

## Create And Update Contract

For `inheritance.create` and `inheritance.update`:

1. Render the requested new UI directly in the state layer.
2. Use bbox as hard layout guidance.
3. Use Chinese visible text from `visible_text`, `text`, `description`, `ui_intent`, blueprint state descriptions, or registry text.
4. Never render component ids, debug ids, state labels, or placeholder names as visible UI copy.
5. Avoid generic filler copy unless the model input explicitly lacks any usable visible text.
6. Non-floating content must avoid kept top/status/nav and bottom/tab regions.
7. Floating components may cover kept regions when appropriate.

If `component_codegen` is present, it contains React-first component records for
flat create/update components. Each record keeps the authoritative `reactCode`
and the runner-rendered static `html/css`. Prefer the rendered snippets over
rewriting those components from scratch:

1. Use `component_codegen.components[].component.html` for matching state and component id.
2. Include the corresponding `component.css` in the returned `css`.
3. Keep the root `data-component-id` unchanged.
4. You may adjust only minimal wrapper context needed to compose the full state layer.
5. If a component has multiple records across states, use the record for the current state; otherwise use the latest previous record with the same id.

## Ant Design Visual Language

Use Ant Design Mobile style as the visual reference:

- `Button`: primary actions, disabled/loading states.
- `Card`: rounded grouped content blocks.
- `Input`: text entry rows.
- `Radio`: single-choice options.
- `List`: vertical list rows.
- `Tag`: status badges.
- `Skeleton`: loading placeholders.
- `Modal`: centered dialogs.
- `Drawer`: bottom or side panels.
- `Toast`: static styled notice for success/error feedback.

Visual requirements:

1. Prefer clean white cards over noisy borders.
2. Use consistent 8px/12px/16px spacing.
3. Use rounded corners, subtle shadows, and light neutral backgrounds.
4. Keep typography hierarchy clear.
5. Follow Gestalt grouping: related controls should be visually grouped, unrelated controls separated.
6. Preserve the given mobile viewport width. Use `viewport.initial_height` as the initial screen height, but allow taller scrollable content when needed.

## Floating Components

For overlays, modals, drawers, bottom sheets, toasts, and popovers:

1. Full-screen overlay/mask should cover `left:0; top:0; width:viewport.width; min-height:viewport.initial_height`. If content extends below the initial height, the mask should visually continue with that content.
2. Bottom sheets should align to the bottom and look like AntD Mobile drawers.
   If a BottomSheet bbox provides `top`, set its height to
   `viewport.initial_height - top` unless the state explicitly says the sheet is
   a small floating popover. Do not leave the original bottom navigation visible
   below the sheet.
3. Center modals should be visually centered and have a translucent mask.
4. Toast/success feedback should be prominent but not consume the full page unless specified.

## JSON Discipline

1. Return valid JSON parsable by `JSON.parse`.
2. Escape quotes inside HTML/CSS strings correctly.
3. Do not wrap the JSON in markdown fences.
4. If a field is unknown, omit it or use an empty string; do not invent fake data.
