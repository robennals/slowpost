import type { Meta, StoryObj } from '@storybook/react';
import { FollowerList } from '../FollowerList';
import { sampleHome } from '../../lib/data';

const meta: Meta<typeof FollowerList> = {
  title: 'Home/FollowerList',
  component: FollowerList,
  args: {
    followers: sampleHome.followers
  }
};

export default meta;

type Story = StoryObj<typeof FollowerList>;

export const Default: Story = {};

export const CloseFriendsOnly: Story = {
  args: {
    followers: sampleHome.followers.map((follower) => ({ ...follower, isCloseFriend: true }))
  }
};
