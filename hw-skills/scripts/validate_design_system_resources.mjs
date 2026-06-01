#!/usr/bin/env node

/**
 * Design System Skill v1.0 - Resource Consistency Validator
 *
 * Validates that:
 * 1. blocks.json files/stories paths exist
 * 2. components.json path/stories paths exist
 * 3. assets.json asset paths exist
 * 4. layout reference_blocks reference existing blocks
 * 5. layout needed_components reference existing components
 * 6. layout related_assets / asset_mapping reference existing assets
 * 7. block dependencies reference existing components
 * 8. block assets reference existing assets
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const projectRoot = ROOT;

let exitCode = 0;
const errors = [];

function logError(msg) {
  errors.push(msg);
  console.error(`✗ ${msg}`);
  exitCode = 1;
}

function logSuccess(msg) {
  console.log(`✓ ${msg}`);
}

function loadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (e) {
    logError(`Failed to parse JSON: ${filePath}`);
    return null;
  }
}

function checkPath(relativePath, root = projectRoot) {
  return existsSync(join(root, relativePath));
}

const componentsSpecDir = join(ROOT, 'src', 'components-specs');
const blocksSpecDir = join(ROOT, 'src', 'blocks-specs');
const layoutDir = join(ROOT, 'src', 'pages-specs', 'layout');
const assetsDir = join(ROOT, 'src', 'assets');

console.log(`\n=== Design System Resource Validation ===`);
console.log(`Components path: ${componentsSpecDir}`);
console.log(`Blocks path: ${blocksSpecDir}`);
console.log(`Layout path: ${layoutDir}`);
console.log(`Project root: ${projectRoot}\n`);

// Load blocks.json
const blocksPath = join(blocksSpecDir, 'blocks.json');
const blocksData = existsSync(blocksPath) ? loadJson(blocksPath) : { blocks: [] };
if (!blocksData) process.exit(1);

// Load components.json
const componentsPath = join(componentsSpecDir, 'components.json');
const componentsData = loadJson(componentsPath);
if (!componentsData) process.exit(1);

// Load assets.json when present
const assetsPath = join(assetsDir, 'assets.json');
const assetsData = existsSync(assetsPath) ? loadJson(assetsPath) : null;

// Build lookup sets
const blockIds = new Set((blocksData.blocks || []).map(b => b.id));
const componentIds = new Set(componentsData.components.map(c => c.id));
const assetIds = new Set((assetsData?.assets || []).map(a => a.id));

// ============================================
// 1. Validate blocks.json files and stories
// ============================================
console.log('--- Validating blocks.json ---');

for (const block of blocksData.blocks) {
  // Check files (files is an array of strings like ["src/blocks/water-settings.tsx"])
  for (const file of block.files || []) {
    if (!checkPath(file)) {
      logError(`blocks.json > ${block.id} > files: "${file}" does not exist`);
    } else {
      logSuccess(`blocks.json > ${block.id} > files: "${file}" exists`);
    }
  }

  // Check stories (stories is an array of strings)
  if (!block.stories || block.stories.length === 0) {
    console.log(`⚠ blocks.json > ${block.id} > stories: empty (${block.stories?.reason || 'no reason provided'})`);
  } else {
    for (const story of block.stories || []) {
      if (!checkPath(story)) {
        logError(`blocks.json > ${block.id} > stories: "${story}" does not exist`);
      } else {
        logSuccess(`blocks.json > ${block.id} > stories: "${story}" exists`);
      }
    }
  }

  // Check dependencies
  for (const dep of block.dependencies || []) {
    if (!componentIds.has(dep)) {
      logError(`blocks.json > ${block.id} > dependencies: "${dep}" not found in components.json`);
    }
  }

  // Check assets
  for (const assetId of block.assets || []) {
    if (!assetIds.has(assetId)) {
      logError(`blocks.json > ${block.id} > assets: "${assetId}" not found in assets.json`);
    } else {
      logSuccess(`blocks.json > ${block.id} > assets: "${assetId}" exists in assets.json`);
    }
  }
}

// ============================================
// 2. Validate components.json paths and stories
// ============================================
console.log('\n--- Validating components.json ---');

for (const comp of componentsData.components) {
  // Check path directory exists
  const compPath = join(projectRoot, comp.path);
  if (!existsSync(compPath)) {
    logError(`components.json > ${comp.id} > path: "${comp.path}" does not exist`);
  } else {
    logSuccess(`components.json > ${comp.id} > path: "${comp.path}" exists`);
  }

  // Check stories
  if (comp.stories) {
    if (!checkPath(comp.stories)) {
      logError(`components.json > ${comp.id} > stories: "${comp.stories}" does not exist`);
    } else {
      logSuccess(`components.json > ${comp.id} > stories: "${comp.stories}" exists`);
    }
  }
}

// ============================================
// 3. Validate assets.json paths
// ============================================
if (assetsData) {
  console.log('\n--- Validating assets.json ---');

  for (const asset of assetsData.assets || []) {
    if (!checkPath(asset.path)) {
      logError(`assets.json > ${asset.id} > path: "${asset.path}" does not exist`);
    } else {
      logSuccess(`assets.json > ${asset.id} > path: "${asset.path}" exists`);
    }
  }
}

// ============================================
// 4. Validate layout markdown reference_blocks, needed_components, related_assets
// ============================================
console.log('\n--- Validating layout markdown files ---');

const layoutFiles = existsSync(layoutDir)
  ? readdirSync(layoutDir).filter((file) => file.endsWith('.md') && file !== 'index.md')
  : [];

for (const layoutFile of layoutFiles) {
  const layoutPath = join(layoutDir, layoutFile);
  if (!existsSync(layoutPath)) {
    logError(`layout > ${layoutFile}: file does not exist`);
    continue;
  }

  console.log(`\nValidating: ${layoutFile}`);
  const content = readFileSync(layoutPath, 'utf-8');

  // Extract reference_blocks
  const refBlocksMatch = content.match(/## reference_blocks\n\n([\s\S]*?)(?=\n## |\n---|$)/);
  if (refBlocksMatch) {
    const refs = refBlocksMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('- `'))
      .map(line => line.match(/- `([^`]+)`/)?.[1])
      .filter(Boolean);

    for (const ref of refs) {
      if (!blockIds.has(ref)) {
        logError(`layout > ${layoutFile} > reference_blocks: "${ref}" not found in blocks.json`);
      } else {
        logSuccess(`layout > ${layoutFile} > reference_blocks: "${ref}" exists in blocks.json`);
      }
    }
  }

  // Extract needed_components
  const neededMatch = content.match(/## needed_components\n\n([\s\S]*?)(?=\n## |\n---|$)/);
  if (neededMatch) {
    const needed = neededMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('- `'))
      .map(line => line.match(/- `([^`]+)`/)?.[1])
      .filter(Boolean);

    for (const comp of needed) {
      if (!componentIds.has(comp)) {
        logError(`layout > ${layoutFile} > needed_components: "${comp}" not found in components.json`);
      } else {
        logSuccess(`layout > ${layoutFile} > needed_components: "${comp}" exists in components.json`);
      }
    }
  }

  // Extract related_assets
  const relatedAssetsMatch = content.match(/## related_assets\n\n([\s\S]*?)(?=\n## |\n---|$)/);
  if (relatedAssetsMatch) {
    const relatedAssets = relatedAssetsMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('- `'))
      .map(line => line.match(/- `([^`]+)`/)?.[1])
      .filter(Boolean);

    for (const assetId of relatedAssets) {
      if (!assetIds.has(assetId)) {
        logError(`layout > ${layoutFile} > related_assets: "${assetId}" not found in assets.json`);
      } else {
        logSuccess(`layout > ${layoutFile} > related_assets: "${assetId}" exists in assets.json`);
      }
    }
  }

  // Extract asset_mapping
  const assetMappingSection = content.match(/## asset_mapping\n\n([\s\S]*?)(?=\n## |\n---|$)/);
  if (assetMappingSection) {
    const mappedAssetIds = Array.from(assetMappingSection[1].matchAll(/`([^`]+)`/g))
      .map((match) => match[1])
      .filter((value, index, array) => index % 2 === 1 && array.indexOf(value) === index);

    for (const assetId of mappedAssetIds) {
      if (!assetIds.has(assetId)) {
        logError(`layout > ${layoutFile} > asset_mapping: "${assetId}" not found in assets.json`);
      } else {
        logSuccess(`layout > ${layoutFile} > asset_mapping: "${assetId}" exists in assets.json`);
      }
    }
  }
}

// ============================================
// Summary
// ============================================
console.log('\n=== Validation Summary ===');
if (exitCode === 0) {
  console.log('✓ All validations passed');
} else {
  console.log(`✗ ${errors.length} error(s) found`);
  console.log('\nErrors:');
  errors.forEach(e => console.log(`  - ${e}`));
}

process.exit(exitCode);
