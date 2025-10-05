import type { Meta, StoryObj } from '@storybook/react';
import { ProfileSummary } from './ProfileSummary';
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

export const OwnProfile: Story = {};

export const OtherProfile: Story = {
  args: {
    profile: { ...sampleProfile, isSelf: false, isFollowing: true }
  }
};
