import type { Meta, StoryObj } from '@storybook/react';
import FollowersPanel from './FollowersPanel';
import { sampleFollowers } from '../lib/data';

const meta: Meta<typeof FollowersPanel> = {
  title: 'Followers/FollowersPanel',
  component: FollowersPanel,
  args: {
    followers: sampleFollowers
  }
};

export default meta;

type Story = StoryObj<typeof FollowersPanel>;

export const Default: Story = {};
