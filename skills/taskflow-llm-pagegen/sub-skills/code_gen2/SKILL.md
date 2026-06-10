---
name: taskflow-code-gen2
description: Experimental hw-components codegen copy with component resources, generating taskflow state implementation models and static page layers.
disable-model-invocation: true
---

# Taskflow Code Gen2

This is a side-by-side copy of the `hw-components` branch codegen skill. It is
kept separate from `sub-skills/codegen` so the default pipeline is not changed.

This sub-skill turns a confirmed blueprint and semantic registry into renderable
state layers. Its component path is React-first: component generation produces
React source, the runner server-renders that source to static HTML, and page
layers inject the rendered HTML/CSS.

## Sub-skills

1. `sub-skills/state-implementation-model`
   - Uses `SKILL.md` as the model prompt.
   - Generates `state_implementation_model.llm.json`.
   - Validates that only `keep`, `create`, and `update` are used.

2. `sub-skills/page-layer`
   - Uses `SKILL.md` as the page-generation prompt.
   - Injects blueprint, semantic registry, and state implementation model.
   - Generates static HTML/CSS state layers.
   - Performs keep-placeholder fill and Playwright screenshot validation.

3. `sub-skills/component-codegen`
   - Uses the local `resources/components` React source as real component
     building blocks.
   - Stores both `reactCode` and React-SSR rendered `html/css`.
   - For update operations, passes previous React source back to the model, not
     the rendered HTML.

## Output

- `state_implementation/state_implementation_model.llm.json`
- `llm_layer_codegen/llm_layer.generated.json`
- `html/Index.state-model.llm-layers.html`
- `llm_layer_codegen/auto_shots/state_layers_report.json`
