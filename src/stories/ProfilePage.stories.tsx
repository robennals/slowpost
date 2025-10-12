import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import ProfilePage from '@/app/[username]/page';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { MockFetch, createJsonResponse, getPathname } from '@/storybook/MockFetch';
import { __resetMockNavigation, __setMockParams } from 'next/navigation';

const meta: Meta<typeof ProfilePage> = {
  title: 'Pages/ProfilePage',
  component: ProfilePage,
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

let currentProfile = {
  username: 'jane',
  fullName: 'Jane Doe',
  bio: 'Organizer and letter writer',
  photoUrl: '',
};

const handler = async (input: RequestInfo, init?: RequestInit) => {
  const method = init?.method || (input instanceof Request ? input.method : 'GET');
  const pathname = getPathname(input);
  if (pathname === '/api/profiles/jane' && method === 'GET') {
    return createJsonResponse(currentProfile);
  }
  if (pathname === '/api/profiles/jane' && method === 'PUT') {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    currentProfile = { ...currentProfile, ...body };
    return createJsonResponse(currentProfile);
  }
  if (pathname.startsWith('/api/groups/user/')) {
    return createJsonResponse([
      {
        groupName: 'book-club',
        displayName: 'Book Club',
        description: 'Monthly reading night',
        isPublic: true,
        memberBio: 'Organizer',
      },
    ]);
  }
  if (pathname.startsWith('/api/subscribers/')) {
    return createJsonResponse([]);
  }
  if (pathname.startsWith('/api/groups/')) {
    return createJsonResponse({ groupName: 'book-club', displayName: 'Book Club' });
  }
  return createJsonResponse({}, 200);
};

export const EditProfile: Story = {
  render: () => {
    __resetMockNavigation();
    __setMockParams({ username: 'jane' });
    currentProfile = {
      username: 'jane',
      fullName: 'Jane Doe',
      bio: 'Organizer and letter writer',
      photoUrl: '',
    };
    return (
      <MockFetch handler={handler}>
        <AuthContext.Provider value={authValue}>
          <ProfilePage />
        </AuthContext.Provider>
      </MockFetch>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Jane Doe')).toBeInTheDocument();
    await userEvent.click(await canvas.findByRole('button', { name: /edit profile/i }));

    await step('Update profile details', async () => {
      const fullNameInput = await canvas.findByPlaceholderText(/full name/i);
      await userEvent.clear(fullNameInput);
      await userEvent.type(fullNameInput, 'Jane Awesome');
      const bioInput = await canvas.findByPlaceholderText(/tell us about yourself/i);
      await userEvent.clear(bioInput);
      await userEvent.type(bioInput, 'Writing annual letters.');
      await userEvent.click(await canvas.findByRole('button', { name: /save/i }));
    });

    await expect(await canvas.findByText('Jane Awesome')).toBeInTheDocument();
    await expect(await canvas.findByText('Writing annual letters.')).toBeInTheDocument();
  },
};
