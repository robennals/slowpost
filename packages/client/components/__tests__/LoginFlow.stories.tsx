import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/jest';
import { userEvent, waitFor, within } from '@storybook/testing-library';
import { LoginFlow } from '../LoginFlow';

function createSpy<Args extends unknown[]>() {
  const calls: Args[] = [];
  const handler = (...args: Args) => {
    calls.push(args);
  };
  return Object.assign(handler, { calls });
}

const onCompleteSpy = createSpy<[string]>();

const meta: Meta<typeof LoginFlow> = {
  title: 'Auth/LoginFlow',
  component: LoginFlow,
  args: {
    onComplete: onCompleteSpy
  }
};

export default meta;

type Story = StoryObj<typeof LoginFlow>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    onCompleteSpy.calls.length = 0;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith('/api/login/request')) {
        return new Response(JSON.stringify({ message: 'PIN sent. Please check your email.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.endsWith('/api/login/verify')) {
        return new Response(JSON.stringify({ username: 'ada' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    };

    try {
      const emailInput = canvas.getByLabelText(/email address/i);
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'ada@example.com{enter}');

      const enterPinButton = await canvas.findByRole('button', { name: /enter pin/i });
      await userEvent.click(enterPinButton);

      const pinInput = await canvas.findByLabelText(/enter the pin/i);
      await userEvent.clear(pinInput);
      await userEvent.type(pinInput, '123456{enter}');

      await waitFor(() => expect(onCompleteSpy.calls).toContainEqual(['ada']));
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
};

export const Signup: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    onCompleteSpy.calls.length = 0;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith('/api/signup/request')) {
        return new Response(JSON.stringify({ message: 'PIN sent. Check your email to continue signing up.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.endsWith('/api/signup/verify')) {
        return new Response(JSON.stringify({ username: 'newuser' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.endsWith('/api/signup/complete')) {
        return new Response(JSON.stringify({ username: 'newuser' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    };

    try {
      const switchModeButton = canvas.getByRole('button', { name: /sign up/i });
      await userEvent.click(switchModeButton);

      const emailInput = canvas.getByLabelText(/email address/i);
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'new@example.com{enter}');

      const enterPinButton = await canvas.findByRole('button', { name: /enter pin/i });
      await userEvent.click(enterPinButton);

      const pinInput = await canvas.findByLabelText(/enter the pin/i);
      await userEvent.clear(pinInput);
      await userEvent.type(pinInput, 'abcdef{enter}');

      const usernameInput = await canvas.findByLabelText(/choose a username/i);
      await userEvent.clear(usernameInput);
      await userEvent.type(usernameInput, 'newuser');

      const nameInput = await canvas.findByLabelText(/your name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'New User');

      const createButton = canvas.getByRole('button', { name: /create account/i });
      await userEvent.click(createButton);

      await waitFor(() => expect(onCompleteSpy.calls).toContainEqual(['newuser']));
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
};
