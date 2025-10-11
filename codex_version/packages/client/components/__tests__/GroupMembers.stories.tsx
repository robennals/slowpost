import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import { GroupMembers } from '../GroupMembers';
import { sampleGroup } from '../../lib/data';

const meta: Meta<typeof GroupMembers> = {
  title: 'Groups/GroupMembers',
  component: GroupMembers,
  args: {
    group: sampleGroup
  }
};

export default meta;

type Story = StoryObj<typeof GroupMembers>;

export const PrivateGroup: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: /future society/i })).toBeInTheDocument();
    await expect(canvas.getByText(/private group • invitation only/i)).toBeInTheDocument();

    const requestButton = canvas.getByRole('button', { name: /request to join/i });
    await userEvent.click(requestButton);
    await expect(requestButton).toHaveFocus();
  }
};

export const PublicGroup: Story = {
  args: {
    group: { ...sampleGroup, isPrivate: false, name: 'Slow Adventurers' }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: /slow adventurers/i })).toBeInTheDocument();
    await expect(canvas.getByText(/public group/i)).toBeInTheDocument();
  }
};
