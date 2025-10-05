import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/jest';
import { userEvent, waitFor, within } from '@storybook/testing-library';
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getAllByRole('listitem')).toHaveLength(2);
    await expect(canvas.getByRole('textbox')).toHaveValue('Grace Hopper <grace@slowpost.org>');

    const closeFriendsOnly = canvas.getByRole('checkbox', { name: /close friends only/i });
    await userEvent.click(closeFriendsOnly);

    await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(1));

    const graceItem = canvas.getByText('Grace Hopper').closest('li');
    if (!graceItem) {
      throw new Error('Grace Hopper list item not found');
    }
    const graceScope = within(graceItem);
    await userEvent.click(graceScope.getByRole('checkbox', { name: /close friend/i }));

    await waitFor(() => expect(canvas.queryAllByRole('listitem')).toHaveLength(0));
    await waitFor(() => expect(canvas.getByRole('textbox')).toHaveValue(''));

    await userEvent.click(closeFriendsOnly);
    await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(2));

    const elonItem = canvas.getByText('Elon Slow').closest('li');
    if (!elonItem) {
      throw new Error('Elon Slow list item not found');
    }
    const elonScope = within(elonItem);
    await userEvent.click(elonScope.getByRole('checkbox', { name: /close friend/i }));

    await waitFor(() =>
      expect(canvas.getByRole('textbox')).toHaveValue('Elon Slow <elon@slowpost.org>')
    );
  }
};

export const CloseFriendsOnly: Story = {
  args: {
    followers: sampleHome.followers.map((follower) => ({ ...follower, isCloseFriend: true }))
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const closeFriendsOnly = canvas.getByRole('checkbox', { name: /close friends only/i });
    await userEvent.click(closeFriendsOnly);

    await waitFor(() => expect(canvas.getAllByRole('listitem')).toHaveLength(2));
    await expect(canvas.getByRole('textbox')).toHaveValue(
      'Grace Hopper <grace@slowpost.org>, Elon Slow <elon@slowpost.org>'
    );
  }
};
