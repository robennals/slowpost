import type { Meta, StoryObj } from '@storybook/react';
import { LoginFlow } from './LoginFlow';

const meta: Meta<typeof LoginFlow> = {
  title: 'Auth/LoginFlow',
  component: LoginFlow
};

export default meta;

type Story = StoryObj<typeof LoginFlow>;

export const Default: Story = {};
