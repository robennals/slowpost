import { addons } from '@storybook/addons';
import { STORY_RENDERED } from '@storybook/core-events';

// Your context component - adjust the import path as needed
import { YourContextProvider } from '../path/to/your/context';

// Register the addon
addons.register('context-wrapper', () => {
  // This runs when the addon is loaded
  console.log('Context wrapper addon loaded');
});

// You can also create a decorator function that you can use in stories
export const withContext = (contextProps = {}) => (Story, context) => {
  return (
    <YourContextProvider {...contextProps}>
      <Story />
    </YourContextProvider>
  );
};
