import { setProjectAnnotations } from '@storybook/react';
import preview from '../../.storybook/preview';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

// Configure Storybook to use the global `act` from React
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Suppress act() warnings for Storybook tests in jsdom mode
// These warnings don't appear in browser mode and are overly strict for story testing
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: An update to') &&
    args[0].includes('inside a test was not wrapped in act')
  ) {
    return;
  }
  originalError(...args);
};

setProjectAnnotations(preview);
