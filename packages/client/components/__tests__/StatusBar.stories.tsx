import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/jest';
import { within } from '@storybook/testing-library';
import { StatusBar } from '../StatusBar';

const meta: Meta<typeof StatusBar> = {
  title: 'Navigation/StatusBar',
  component: StatusBar,
  args: {
    isLoggedIn: false
  }
};

export default meta;

type Story = StoryObj<typeof StatusBar>;

export const LoggedOut: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: /slowpost/i })).toHaveAttribute('href', '/');
    await expect(canvas.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/p/login');
  }
};

export const LoggedIn: Story = {
  args: {
    isLoggedIn: true,
    username: 'ada'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/ada');
  }
};
