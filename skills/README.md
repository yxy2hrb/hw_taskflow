# Taskflow Skills

This directory contains Cursor skills for the taskflow page-generation pipeline.
The current production entry is `taskflow-llm-pagegen`, a self-contained skill
that turns a `new_test/<case>` directory into static, screenshot-verifiable
mobile taskflow pages.

## Runtime Dependencies

The skill code, prompts, local component references, CSS tokens, SSR shims, and
validation scripts live under `.cursor/skills/taskflow-llm-pagegen`.

Runtime still requires the workspace environment to provide:

- Node.js with `fetch` support.
- Installed Node dependencies used by the runner, especially `playwright`,
  `react`, `react-dom`, and `esbuild`.
- A model-compatible API key, typically `DASHSCOPE_API_KEY` or
  `OPENAI_API_KEY`.
- Optional `.cursor/skills/taskflow-llm-pagegen/.env` for skill-local API
  configuration. The runner also remains compatible with `backend/.env`.

Input case files, such as `new_test/<case>/input.txt` and source HTML, are
external inputs. Old taskflow codegen scripts, repository-root `scripts/*.js`,
and external app source trees are not required by `code_gen2`.

## Architecture

```text
taskflow-llm-pagegen
  scripts/run_skill.js
  sub-skills/
    preprocess/
    blueprint/
    codegen/                 # legacy static path
    code_gen2/               # current React-first path
      sub-skills/
        state-implementation-model/
        component-codegen/
        page-layer/
```

The pipeline is intentionally self-contained. Runners under
`taskflow-llm-pagegen` should call only files inside this skill directory and
should not call repository-root `scripts/*.js` or older taskflow codegen skills.

## End-To-End Flow

```text
source D2C HTML + taskflow brief
  -> preprocess
  -> blueprint
  -> state-implementation-model
  -> component-codegen
  -> page-layer
  -> Playwright screenshots + report
```

### 1. Preprocess

Path: `taskflow-llm-pagegen/sub-skills/preprocess`

Responsibilities:

- Collect visible div bounding boxes with Playwright.
- Ask the model for semantic annotations.
- Replace the original body with semantic comments.
- Build `semantic_registry.json` and `semantic_anchors.js`.

Main outputs:

- `.run_skill/<stamp>/preprocess/Index.preprocessed.html`
- `.run_skill/<stamp>/preprocess/semantic_registry.json`
- `.run_skill/<stamp>/preprocess/semantic_anchors.js`

### 2. Blueprint

Path: `taskflow-llm-pagegen/sub-skills/blueprint`

Responsibilities:

- Phase 1: generate a user story.
- Phase 2: enumerate happy-path states.
- Phase 3: propose implementation plans.
- Phase 4: merge confirmed results into `blueprint_builder_input.json`.

Main output:

- `.run_skill/<stamp>/blueprint/phase4/stages/blueprint_builder_input.json`

### 3. State Implementation Model

Path for `code_gen2`:
`taskflow-llm-pagegen/sub-skills/code_gen2/sub-skills/state-implementation-model`

Responsibilities:

- Convert the blueprint and semantic registry into
  `state_implementation_model.llm.json`.
- Represent each state using:
  - `inheritance.keep`
  - `inheritance.create`
  - `inheritance.update`
- Use content-driven layout hints for ordinary page cards.
- Use fixed bbox and z-index for overlays, sheets, modals, top bars, and bottom
  bars.
- Validate that states reference existing original anchors or earlier virtual
  component ids.

Important convention:

- `keep` means an original or virtual component remains visually unchanged.
- `create` means a new flat virtual component is introduced.
- `update` means an existing original or virtual component changes.
- Rich card business content is decided in this stage, not by component-codegen.
- Nested child components are represented as `children`; child components do
  not need page-level bbox.

Main output:

- `.run_skill/<stamp>/state_implementation/state_implementation_model.llm.json`

### 4. Component Codegen

Path for `code_gen2`:
`taskflow-llm-pagegen/sub-skills/code_gen2/sub-skills/component-codegen`

Responsibilities:

- Generate React source one component at a time.
- Generate component trees bottom-up: children first, parent imports children.
- Render React source through local SSR to static HTML/CSS.
- Strictly render state model content; do not invent business data.

Output contract:

```json
{
  "id": "component_id",
  "reactCode": "import React from 'react'; ...",
  "html": "<div data-component-id=\"component_id\">...</div>",
  "css": ".tf-cg-card{...}",
  "notes": "optional short note"
}
```

Main output:

- `.run_skill/<stamp>/code_gen2_component_codegen/component_codegen.generated.json`

### 5. Page Layer

Path for `code_gen2`:
`taskflow-llm-pagegen/sub-skills/code_gen2/sub-skills/page-layer`

Responsibilities:

- Generate placeholder-based state-layer HTML/CSS with an LLM.
- Use keep placeholders for original anchors and component placeholders for
  generated components.
- Replace component placeholders with React SSR HTML/CSS.
- Fill keep placeholders from `semantic_registry`.
- Preserve z-index layering for overlays, sheets, modals, status bars, and
  bottom bars.
- Assemble a static HTML page and capture Playwright screenshots.

Main outputs:

- `html/Index.state-model.code-gen2-layers.html`
- `.run_skill/<stamp>/code_gen2_llm_layer_codegen/llm_layer.generated.json`
- `.run_skill/<stamp>/code_gen2_llm_layer_codegen/auto_shots/state_layers_report.json`

## Running The Full Pipeline

### Required Input Structure

The top-level runner accepts either an input directory or explicit file paths.
The recommended directory layout is:

```text
new_test/<case>/
  input.txt
  html/
    Index.original.html
  wps_doc_0.png              # optional, used only for viewport inference
```

Required files:

- `input.txt`: taskflow brief in plain text. This is the natural-language
  description of the user journey to generate.
- `html/Index.original.html`: source D2C HTML page. The runner also accepts
  `html/Index.html` or `html/index.html` as fallback names.

Optional files:

- `wps_doc_0.png`: source screenshot. When `--image` is provided and
  `--width/--height` are omitted, the runner reads the PNG dimensions and uses
  them as the viewport.

Generated files are written under:

```text
new_test/<case>/
  .run_skill/<stamp>/
  html/Index.state-model.llm-layers.html
```

### Top-Level Command

Default:

```bash
node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js new_test/2 --model qwen3.7-max
```

Current React-first path:

```bash
node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js new_test/2 \
  --model qwen3.7-max \
  --codegen code_gen2 \
  --width 360 \
  --height 792
```

Explicit inputs:

```bash
node .cursor/skills/taskflow-llm-pagegen/scripts/run_skill.js new_test/2 \
  --image new_test/2/wps_doc_0.png \
  --html new_test/2/html/Index.original.html \
  --input new_test/2/input.txt \
  --width 360 \
  --height 792 \
  --model qwen3.7-max \
  --codegen code_gen2
```

### Top-Level Parameters

`scripts/run_skill.js` supports these arguments:

| Argument | Required | Default | Meaning |
| --- | --- | --- | --- |
| `<inputDir>` | yes, unless `--html` and `--input` are both provided | none | Case directory, for example `new_test/2`. Used as the base for outputs and default input discovery. |
| `--model <name>` | no | `qwen3.7-max` | Model name passed to all LLM-backed sub-skills. |
| `--image <path>` | no | empty | Source screenshot path. Used only to infer viewport width/height when explicit dimensions are omitted. |
| `--html <path>` | no | first existing `html/Index.original.html`, `html/Index.html`, `html/index.html` under `<inputDir>` | Source D2C HTML file. |
| `--input <path>` | no | `<inputDir>/input.txt` | Taskflow brief text file. |
| `--width <px>` | no | image width if `--image` is valid, otherwise `360` | Locked viewport width for bbox collection, prompts, layout generation, and screenshots. |
| `--height <px>` | no | image height if `--image` is valid, otherwise `792` | Initial viewport height for bbox collection and screenshots. Generated pages may be taller. |
| `--stamp <value>` | no | current timestamp `YYYYMMDDHHMMSS` | Output run id under `.run_skill/<stamp>`. Useful for reproducible reruns. |

Resolution rules:

1. If `<inputDir>` is provided, relative paths are resolved from the repository
   root and outputs are written under that directory.
2. If `<inputDir>` is omitted, both `--html` and `--input` must be provided.
   The runner infers the case directory from the HTML path.
3. If `--html` is omitted, the runner searches the input directory for
   `html/Index.original.html`, then `html/Index.html`, then `html/index.html`.
4. If `--width/--height` are omitted and `--image` points to a valid PNG, the
   PNG dimensions are used.
5. If no valid image dimensions are available, viewport defaults to `360x792`.
6. Width is treated as locked throughout the pipeline. Height is the initial
   viewport, not a maximum content height.

Viewport behavior:

- `--width` is locked throughout generation.
- `--height` is the initial viewport height.
- Generated pages may become taller than the initial height when content needs
  vertical scrolling.
- If `--image` is provided and width/height are omitted, the runner can infer
  the viewport from the PNG dimensions.

## Running Individual Stages

Generate React components from an existing state model:

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/code_gen2/sub-skills/component-codegen/scripts/run_skill.js new_test/2 \
  --model qwen3.7-max \
  --state-model new_test/2/.run_skill/<stamp>/state_implementation/state_implementation_model.llm.json \
  --out-dir new_test/2/.run_skill/<stamp>/code_gen2_component_codegen \
  --width 360 \
  --height 792
```

Generate placeholder page layers using React component output:

```bash
node .cursor/skills/taskflow-llm-pagegen/sub-skills/code_gen2/sub-skills/page-layer/scripts/run_skill.js new_test/2 \
  --model qwen3.7-max \
  --html new_test/2/.run_skill/<stamp>/preprocess/Index.preprocessed.html \
  --registry new_test/2/.run_skill/<stamp>/preprocess/semantic_registry.json \
  --state-model new_test/2/.run_skill/<stamp>/state_implementation/state_implementation_model.llm.json \
  --blueprint new_test/2/.run_skill/<stamp>/blueprint/phase4/stages/blueprint_builder_input.json \
  --component-codegen new_test/2/.run_skill/<stamp>/code_gen2_component_codegen/component_codegen.generated.json \
  --out-dir new_test/2/.run_skill/<stamp>/code_gen2_llm_layer_codegen \
  --out-html new_test/2/html/Index.state-model.code-gen2-layers.html \
  --width 360 \
  --height 792
```

## Output Reports

The top-level runner writes:

- `.run_skill/<stamp>/input_manifest.json`
- `.run_skill/<stamp>/run_report.json`

`run_report.json` summarizes:

- preprocess status
- semantic anchor count
- number of generated states
- state-model validation issues
- page-layer screenshot status
- output paths

## Development Notes

- Keep final runnable output static: no React runtime, Babel, AntD CDN, or
  external network dependencies in generated pages.
- React and Ant Design are design references only.
- Use `code_gen2/sub-skills/component-codegen` for recursive React component
  generation.
- Use `code_gen2/sub-skills/page-layer` for placeholder layout, SSR
  replacement, keep-placeholder fill, and screenshot validation.
- Do not commit generated `.run_skill` outputs unless they are intentionally
  part of a test fixture.
