import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import GroupsPage from '@/app/groups/page';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { MockFetch, createJsonResponse, getPathname } from '@/storybook/MockFetch';

const meta: Meta<typeof GroupsPage> = {
  title: 'Pages/GroupsPage',
  component: GroupsPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const authValue: AuthContextType = {
  user: { username: 'jane', fullName: 'Jane Doe' },
  loading: false,
  refreshUser: async () => undefined,
  logout: async () => undefined,
};

const initialGroups = [
  {
    groupName: 'book-club',
    displayName: 'Book Club',
    description: 'Monthly reading night',
    adminUsername: 'jane',
    isPublic: true,
    memberBio: 'Organizer',
  },
];

let groupsData = [...initialGroups];

const handler = async (input: RequestInfo, init?: RequestInit) => {
  const method = init?.method || (input instanceof Request ? input.method : 'GET');
  const pathname = getPathname(input);

  if (pathname === '/api/groups/user/jane' && method === 'GET') {
    return createJsonResponse(groupsData);
  }
  if (pathname === '/api/groups' && method === 'POST') {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    groupsData = [
      ...groupsData,
      {
        groupName: body.groupName,
        displayName: body.displayName,
        description: body.description,
        adminUsername: 'jane',
        isPublic: body.isPublic,
        memberBio: 'Founder',
      },
    ];
    return createJsonResponse({ success: true });
  }
  return createJsonResponse({}, 200);
};

export const CreateGroupFlow: Story = {
  render: () => {
    groupsData = [...initialGroups];
    return (
      <MockFetch handler={handler}>
        <AuthContext.Provider value={authValue}>
          <GroupsPage />
        </AuthContext.Provider>
      </MockFetch>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Book Club')).toBeInTheDocument();

    await step('Create a new group', async () => {
      await userEvent.click(await canvas.findByRole('button', { name: /create group/i }));
      await userEvent.type(await canvas.findByPlaceholderText(/my-awesome-group/i), 'pen-pals');
      await userEvent.type(await canvas.findByPlaceholderText(/my awesome group/i), 'Pen Pals');
      await userEvent.type(await canvas.findByPlaceholderText(/what is this group about/i), 'Keeping in touch.');
      const checkbox = await canvas.findByRole('checkbox');
      await userEvent.click(checkbox); // make it private
      await userEvent.click(await canvas.findByRole('button', { name: /create group$/i }));
    });

    await expect(await canvas.findByText('Pen Pals')).toBeInTheDocument();
  },
};
