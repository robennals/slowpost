import type { Meta, StoryObj } from '@storybook/react';
import { GroupMembers } from './GroupMembers';
import { sampleGroup } from '../lib/data';

const meta: Meta<typeof GroupMembers> = {
  title: 'Groups/GroupMembers',
  component: GroupMembers,
  args: {
    group: sampleGroup
  }
};

export default meta;

type Story = StoryObj<typeof GroupMembers>;

export const PrivateGroup: Story = {};

export const PublicGroup: Story = {
  args: {
    group: { ...sampleGroup, isPrivate: false, name: 'Slow Adventurers' }
  }
};
