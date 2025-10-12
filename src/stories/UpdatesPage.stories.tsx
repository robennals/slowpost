import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import UpdatesPage from '@/app/updates/page';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { MockFetch, createJsonResponse, getPathname } from '@/storybook/MockFetch';

const meta: Meta<typeof UpdatesPage> = {
  title: 'Pages/UpdatesPage',
  component: UpdatesPage,
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

const handler = async (input: RequestInfo) => {
  const pathname = getPathname(input);
  if (pathname.startsWith('/api/updates/')) {
    return createJsonResponse([
      {
        id: 'u1',
        type: 'new_subscriber',
        username: 'alex',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'u2',
        type: 'group_join',
        username: 'bella',
        groupName: 'book-club',
        timestamp: new Date().toISOString(),
      },
    ]);
  }
  if (pathname.startsWith('/api/profiles/')) {
    const username = pathname.split('/').pop() ?? '';
    const profiles = {
      alex: { fullName: 'Alex Smith' },
      bella: { fullName: 'Bella Chen' },
    } as Record<string, { fullName: string }>;
    return createJsonResponse(profiles[username] ?? { fullName: username });
  }
  if (pathname.startsWith('/api/groups/')) {
    return createJsonResponse({ groupName: 'book-club', displayName: 'Book Club' });
  }
  return createJsonResponse({}, 200);
};

export const RecentUpdates: Story = {
  render: () => (
    <MockFetch handler={handler}>
      <AuthContext.Provider value={authValue}>
        <UpdatesPage />
      </AuthContext.Provider>
    </MockFetch>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { level: 1, name: /updates/i })).toBeInTheDocument();
    const links = await canvas.findAllByRole('link');
    await step('Open the first update link', async () => {
      await userEvent.click(links[0]);
    });
  },
};
