import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within, waitFor } from '@storybook/test';
import SubscribersPage from '@/app/subscribers/page';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { MockFetch, createJsonResponse, getPathname } from '@/storybook/MockFetch';

const meta: Meta<typeof SubscribersPage> = {
  title: 'Pages/SubscribersPage',
  component: SubscribersPage,
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

type SubscriberRecord = {
  subscriberUsername: string;
  subscribedToUsername: string;
  isClose: boolean;
  timestamp: string;
  addedBy?: string;
  confirmed?: boolean;
  fullName?: string;
  email?: string;
  hasAccount?: boolean;
};

const initialSubscribers: SubscriberRecord[] = [
  {
    subscriberUsername: 'alex',
    subscribedToUsername: 'jane',
    isClose: true,
    timestamp: new Date().toISOString(),
    fullName: 'Alex Smith',
    hasAccount: true,
  },
  {
    subscriberUsername: 'bella',
    subscribedToUsername: 'jane',
    isClose: false,
    timestamp: new Date().toISOString(),
    addedBy: 'jane',
    confirmed: false,
    fullName: 'Bella Chen',
    hasAccount: false,
  },
];

let subscribersData: SubscriberRecord[] = [...initialSubscribers];

const handler = async (input: RequestInfo, init?: RequestInit) => {
  const method = init?.method || (input instanceof Request ? input.method : 'GET');
  const pathname = getPathname(input);

  if (pathname === '/api/subscribers/jane' && method === 'GET') {
    return createJsonResponse(subscribersData);
  }
  if (pathname.startsWith('/api/profiles/')) {
    const username = pathname.split('/').pop() ?? '';
    const profile =
      username === 'alex'
        ? { fullName: 'Alex Smith', hasAccount: true }
        : username === 'bella'
        ? { fullName: 'Bella Chen', hasAccount: false }
        : { fullName: username };
    return createJsonResponse(profile);
  }
  if (pathname.startsWith('/api/subscribers/jane/') && method === 'PUT') {
    const username = pathname.split('/').pop() ?? '';
    subscribersData = subscribersData.map((subscriber) =>
      subscriber.subscriberUsername === username
        ? { ...subscriber, isClose: !subscriber.isClose }
        : subscriber,
    );
    return createJsonResponse({ success: true });
  }
  if (pathname.endsWith('/api/subscribers/jane/add-by-email')) {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    subscribersData = [
      ...subscribersData,
      {
        subscriberUsername: body.email.split('@')[0] || 'new',
        subscribedToUsername: 'jane',
        isClose: false,
        timestamp: new Date().toISOString(),
        addedBy: 'jane',
        confirmed: false,
        fullName: body.fullName || body.email,
      },
    ];
    return createJsonResponse({ success: true });
  }
  return createJsonResponse({}, 200);
};

export const ManageSubscribers: Story = {
  render: () => {
    subscribersData = [...initialSubscribers];
    return (
      <MockFetch handler={handler}>
        <AuthContext.Provider value={authValue}>
          <SubscribersPage />
        </AuthContext.Provider>
      </MockFetch>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Alex Smith')).toBeInTheDocument();
    const checkboxes = await canvas.findAllByRole('checkbox', { name: /close friend/i });
    const alexCheckbox = checkboxes.find((checkbox) =>
      checkbox.parentElement?.parentElement?.parentElement?.textContent?.includes('Alex Smith')
    ) as HTMLInputElement | undefined;

    if (!alexCheckbox) {
      throw new Error('Could not locate Alex Smith checkbox');
    }

    await waitFor(() => expect(alexCheckbox).toBeChecked());

    await step('Toggle close friend flag', async () => {
      await userEvent.click(alexCheckbox);
    });

    await waitFor(() => expect(alexCheckbox).not.toBeChecked());
  },
};
