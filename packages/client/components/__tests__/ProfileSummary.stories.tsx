import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/jest';
import { within } from '@storybook/testing-library';
import { ProfileSummary } from '../ProfileSummary';
import { sampleProfile } from '../../lib/data';

const meta: Meta<typeof ProfileSummary> = {
  title: 'Profile/ProfileSummary',
  component: ProfileSummary,
  args: {
    profile: sampleProfile
  }
};

export default meta;

type Story = StoryObj<typeof ProfileSummary>;

export const OwnProfile: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /change photo/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  }
};

export const OtherProfile: Story = {
  args: {
    profile: { ...sampleProfile, isSelf: false, isFollowing: false }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /follow/i })).toBeInTheDocument();
    expect(canvas.queryByRole('button', { name: /change photo/i })).not.toBeInTheDocument();
  }
};
