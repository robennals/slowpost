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

    const emailInput = canvas.getByLabelText(/email address/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'ada@slowpost.org{enter}');

    const continueButton = await canvas.findByRole('button', { name: /enter pin/i });
    await userEvent.click(continueButton);

    const pinInput = await canvas.findByLabelText(/enter the pin/i);
    await userEvent.clear(pinInput);
    await userEvent.type(pinInput, '123456{enter}');

    const usernameInput = await canvas.findByLabelText(/choose a username/i);
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, 'ada{enter}');

    await waitFor(() => expect(onCompleteSpy.calls).toContainEqual(['ada']));
  }
};
