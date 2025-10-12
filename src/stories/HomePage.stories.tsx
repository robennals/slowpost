import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import HomePage from '@/app/page';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { MockFetch, createJsonResponse, getPathname } from '@/storybook/MockFetch';

const meta: Meta<typeof HomePage> = {
  title: 'Pages/HomePage',
  component: HomePage,
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

const profiles: Record<string, { fullName: string }> = {
  alex: { fullName: 'Alex Smith' },
  bella: { fullName: 'Bella Chen' },
  chris: { fullName: 'Chris Lee' },
};

const handler = async (input: RequestInfo) => {
  const pathname = getPathname(input);
  if (pathname.startsWith('/api/groups/user/')) {
    return createJsonResponse([
      { groupName: 'book-club', displayName: 'Book Club', description: 'Monthly reading night' },
    ]);
  }
  if (pathname.startsWith('/api/subscriptions/')) {
    return createJsonResponse([
      { subscribedToUsername: 'alex' },
      { subscribedToUsername: 'bella' },
    ]);
  }
  if (pathname.startsWith('/api/subscribers/')) {
    return createJsonResponse([
      { subscriberUsername: 'chris', isClose: true },
    ]);
  }
  if (pathname.startsWith('/api/updates/')) {
    return createJsonResponse([
      {
        id: 'update-1',
        type: 'new_subscriber',
        username: 'alex',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'update-2',
        type: 'group_join',
        username: 'bella',
        groupName: 'book-club',
        timestamp: new Date().toISOString(),
      },
    ]);
  }
  if (pathname.startsWith('/api/groups/')) {
    return createJsonResponse({ groupName: 'book-club', displayName: 'Book Club' });
  }
  if (pathname.startsWith('/api/profiles/')) {
    const username = pathname.split('/').pop() ?? '';
    return createJsonResponse(profiles[username] ?? { fullName: username });
  }
  return createJsonResponse({}, 404);
};

export const LoggedInOverview: Story = {
  render: () => (
    <MockFetch handler={handler}>
      <AuthContext.Provider value={authValue}>
        <HomePage />
      </AuthContext.Provider>
    </MockFetch>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/welcome back, jane/i)).toBeInTheDocument();
    await expect(await canvas.findByRole('link', { name: /book club/i })).toBeInTheDocument();
    await expect(await canvas.findByText('Alex Smith')).toBeInTheDocument();
    await expect(await canvas.findByText(/subscribed to you/i)).toBeInTheDocument();
  },
};

const loggedOutAuth: AuthContextType = {
  user: null,
  loading: false,
  refreshUser: async () => undefined,
  logout: async () => undefined,
};

export const LoggedOutHero: Story = {
  render: () => (
    <AuthContext.Provider value={loggedOutAuth}>
      <HomePage />
    </AuthContext.Provider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('link', { name: /get started/i })).toBeInTheDocument();
  },
};
