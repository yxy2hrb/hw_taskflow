---
name: taskflow-preprocess
description: Preprocess taskflow HTML by collecting div bboxes, generating semantic annotations, replacing body markup, and building the semantic registry.
disable-model-invocation: true
---

# Taskflow Preprocess

This sub-skill prepares the original D2C HTML for blueprint and code generation.

## Responsibilities

1. `scripts/build_div_bbox.js`
   - Uses Playwright to inspect the mobile page.
   - Outputs candidate div bbox information.
   - Keeps bbox data compact for LLM semantic annotation.

2. `scripts/run_preprocess.js`
   - Builds the semantic annotation prompt inline.
   - Calls Qwen to annotate meaningful divs.
   - Runs `scripts/replace_body.py`.
   - Outputs `Index.preprocessed.html`, `annotated_body_semantic.html`, and `report.json`.

3. `scripts/build_semantic_registry.js`
   - Converts annotated HTML into `semantic_registry.json`.
   - Outputs `semantic_anchors.js`.

## Output

- `preprocess/Index.preprocessed.html`
- `preprocess/annotated_body_semantic.html`
- `preprocess/div_semantic.json`
- `preprocess/semantic_registry.json`
- `preprocess/semantic_anchors.js`
