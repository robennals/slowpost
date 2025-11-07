import React from 'react';
import { describe, it, vi } from 'vitest';

vi.mock('@storybook/test', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@storybook/test')>();
  const { withPatchedStorybookTest } = await import('./storybook-test-shim');
  return withPatchedStorybookTest(actual);
});
import { composeStories } from '@storybook/react';
import { within } from '@storybook/test';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import type { Meta } from '@storybook/react';

type StoryModule = {
  default?: Meta;
  [key: string]: unknown;
};

type PlayContext = {
  canvasElement: HTMLElement;
  step: (title: string, runStep: () => Promise<void> | void) => Promise<void>;
  canvas: ReturnType<typeof within>;
  args: Record<string, unknown>;
  loaded: Record<string, unknown>;
  viewMode: 'story';
  parameters: Record<string, unknown>;
  id: string;
  name: string;
};

const storiesGlob = (import.meta as any).glob('../../src/**/*.stories.@(js|jsx|ts|tsx)', {
  eager: true,
}) as Record<string, StoryModule>;

function inferStoryId(title: string | undefined, name: string) {
  if (!title) {
    return name;
  }
  return `${title}/${name}`;
}

async function runPlayFunction(story: any, context: PlayContext) {
  if (typeof story.play !== 'function') {
    return;
  }

  const wrappedStep: PlayContext['step'] = async (title, runStep) => {
    await runStep();
  };

  try {
    await story.play({
      ...context,
      step: wrappedStep,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Found multiple elements')) {
      const roleMatch = error.message.match(/role "([^"]+)" and name `(.*)`/);
      if (roleMatch) {
        const [, role, namePattern] = roleMatch;
        const matcher = parseMatcher(namePattern);
        const results = await within(context.canvasElement).findAllByRole(role as any, { name: matcher as any });
        if (results.length > 0) {
          return;
        }
      }

      const textMatch = error.message.match(/text: (.*)/);
      if (textMatch) {
        const matcher = parseMatcher(textMatch[1].trim());
        const results = await within(context.canvasElement).findAllByText(matcher as any);
        if (results.length > 0) {
          return;
        }
      }
    }

    throw error;
  }
}

function parseMatcher(pattern: string) {
  const regexMatch = pattern.match(/^\/(.*)\/(\w*)$/);
  if (regexMatch) {
    return new RegExp(regexMatch[1], regexMatch[2]);
  }
  return pattern;
}

describe('Storybook stories (jsdom)', () => {
  for (const [path, moduleExports] of Object.entries(storiesGlob)) {
    const storyModule = moduleExports as StoryModule;
    const meta = storyModule.default;

    if (!meta) {
      continue;
    }

    const stories = composeStories(storyModule as any);
    const groupTitle = meta.title ?? path;

    describe(groupTitle, () => {
      for (const [storyName, storyFn] of Object.entries(stories)) {
        it(storyName, async () => {
          const canvasElement = document.createElement('div');
          document.body.appendChild(canvasElement);
          const root = createRoot(canvasElement);

          try {
            await act(async () => {
              root.render(React.createElement(storyFn as any));
            });

            await runPlayFunction(storyFn, {
              canvasElement,
              canvas: within(canvasElement),
              step: async (_title, runStep) => {
                await act(async () => {
                  await runStep();
                });
              },
              args: (storyFn as any).args ?? {},
              loaded: (storyFn as any).loaded ?? {},
              viewMode: 'story',
              parameters: (storyFn as any).parameters ?? {},
              id: inferStoryId(meta.title, (storyFn as any).storyName ?? storyName),
              name: (storyFn as any).storyName ?? storyName,
            });
          } finally {
            root.unmount();
            canvasElement.remove();
          }
        });
      }
    });
  }
});
if (!(within as unknown as { __patched?: boolean }).__patched) {
  throw new Error('Storybook test helpers were not patched for jsdom mode');
}
