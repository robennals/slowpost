import React from 'react';
import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';

type StoryModule = Record<string, unknown> & { default?: unknown };

const storyModules = import.meta.glob<StoryModule>('./**/*.stories.tsx', { eager: true });

describe('Storybook stories', () => {
  Object.entries(storyModules).forEach(([storyPath, storyModule]) => {
    const meta = storyModule.default;
    if (!meta) {
      return;
    }

    const composed = composeStories(storyModule as any);

    Object.entries(composed).forEach(([storyName, Story]) => {
      it(`${storyPath} - ${storyName} renders without crashing`, () => {
        const { unmount } = render(<Story />);
        unmount();
      });
    });
  });
});
