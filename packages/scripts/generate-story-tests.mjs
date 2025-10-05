import { promises as fs } from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT = process.cwd();
const CLIENT_ROOT = WORKSPACE_ROOT;
const STORIES_GLOB_ROOT = CLIENT_ROOT;
const GENERATED_ROOT = path.join(CLIENT_ROOT, '__generated_tests__');
const STORY_EXTENSIONS = ['.stories.tsx', '.stories.ts'];
const IGNORED_DIRS = new Set(['node_modules', '.next', 'storybook-static', '__generated_tests__']);

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (STORY_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

function toGeneratedPath(storyPath) {
  const relative = path.relative(STORIES_GLOB_ROOT, storyPath);
  const dirname = path.dirname(relative);
  const basename = path.basename(relative).replace(/\.stories\.(tsx|ts)$/u, '.stories.test.tsx');
  return path.join(GENERATED_ROOT, dirname, basename);
}

function toImportPath(fromFile, target) {
  const relative = path.relative(path.dirname(fromFile), target);
  const normalized = relative.startsWith('.') ? relative : `./${relative}`;
  return normalized.replace(/\\/g, '/');
}

async function generate() {
  const stories = await walk(STORIES_GLOB_ROOT);
  await fs.rm(GENERATED_ROOT, { recursive: true, force: true });
  if (stories.length === 0) {
    return;
  }
  for (const storyPath of stories) {
    const outPath = toGeneratedPath(storyPath);
    await ensureDir(path.dirname(outPath));
    const previewImportPath = toImportPath(outPath, path.join(CLIENT_ROOT, '.storybook', 'preview'));
    const storiesImportPath = toImportPath(outPath, storyPath);
    const relativeDisplay = path.relative(CLIENT_ROOT, storyPath).replace(/\\/g, '/');
    const contents = `import React from 'react';
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { composeStories, setProjectAnnotations } from '@storybook/react';
import * as preview from '${previewImportPath}';
import * as stories from '${storiesImportPath}';

setProjectAnnotations([preview]);
const composed = composeStories(stories as Record<string, any>);

describe('Storybook: ${relativeDisplay}', () => {
  for (const [storyName, Story] of Object.entries(composed)) {
    it(storyName, async () => {
      const view = render(React.createElement(Story));
      if (typeof (Story as any).play === 'function') {
        await (Story as any).play({ canvasElement: view.container });
      }
    });
  }
});
`;
    await fs.writeFile(outPath, contents, 'utf8');
  }
}

generate().catch((error) => {
  console.error('[generate-story-tests] Failed:', error);
  process.exitCode = 1;
});
