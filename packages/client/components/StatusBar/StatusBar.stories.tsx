import type { Meta, StoryObj } from '@storybook/react';
import { StatusBar } from './StatusBar';

const meta: Meta<typeof StatusBar> = {
  title: 'Navigation/StatusBar',
  component: StatusBar,
  args: {
    isLoggedIn: false
  }
};

export default meta;

type Story = StoryObj<typeof StatusBar>;

export const LoggedOut: Story = {};

export const LoggedIn: Story = {
  args: {
    isLoggedIn: true,
    username: 'ada'
  }
};
