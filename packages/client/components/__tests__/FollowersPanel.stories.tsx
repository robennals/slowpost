import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import FollowersPanel from '../FollowersPanel';
import { sampleFollowers } from '../../lib/data';

const meta: Meta<typeof FollowersPanel> = {
  title: 'Followers/FollowersPanel',
  component: FollowersPanel,
  args: {
    followers: sampleFollowers
  }
};

export default meta;

type Story = StoryObj<typeof FollowersPanel>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const approveButton = canvas.getByRole('button', { name: /approve/i });
    await userEvent.click(approveButton);
    await expect(approveButton).toHaveFocus();

    const profileLink = canvas.getByRole('link', { name: /view profile/i });
    await expect(profileLink).toHaveAttribute('href', '/ada');
  }
};
