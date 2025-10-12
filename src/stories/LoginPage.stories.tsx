import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within, fn } from '@storybook/test';
import LoginPage from '@/app/login/page';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { MockFetch, createJsonResponse, getPathname } from '@/storybook/MockFetch';
import { __resetMockNavigation, __setMockRouter } from 'next/navigation';

const meta: Meta<typeof LoginPage> = {
  title: 'Pages/LoginPage',
  component: LoginPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const refreshMock = fn();
const routerPushMock = fn();

const authValue: AuthContextType = {
  user: null,
  loading: false,
  refreshUser: async () => {
    refreshMock();
  },
  logout: async () => undefined,
};

const handler = async (input: RequestInfo, init?: RequestInit) => {
  const pathname = getPathname(input);
  if (pathname.endsWith('/api/auth/request-pin')) {
    return createJsonResponse({ requiresSignup: true, pin: '654321' });
  }
  if (pathname.endsWith('/api/auth/signup')) {
    return createJsonResponse({ success: true });
  }
  if (pathname.endsWith('/api/auth/login')) {
    return createJsonResponse({ success: true });
  }
  if (pathname.endsWith('/api/subscribers/jane/add-by-email')) {
    return createJsonResponse({ success: true });
  }
  return createJsonResponse({}, 200);
};

export const SignupFlow: Story = {
  render: () => {
    __resetMockNavigation();
    __setMockRouter({ push: routerPushMock });
    refreshMock.mockClear();
    routerPushMock.mockClear();
    return (
      <MockFetch handler={handler}>
        <AuthContext.Provider value={authValue}>
          <LoginPage />
        </AuthContext.Provider>
      </MockFetch>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const emailInput = await canvas.findByPlaceholderText(/your@email.com/i);
    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.click(await canvas.findByRole('button', { name: /continue/i }));

    await step('Complete sign up form', async () => {
      await expect(await canvas.findByText(/create your account/i)).toBeInTheDocument();
      await userEvent.type(await canvas.findByPlaceholderText(/username/i), 'jane');
      await userEvent.type(await canvas.findByPlaceholderText(/full name/i), 'Jane Doe');
      const pinInput = await canvas.findByPlaceholderText(/enter 6-digit pin/i);
      await userEvent.clear(pinInput);
      await userEvent.type(pinInput, '654321');
      await userEvent.click(await canvas.findByRole('button', { name: /sign up/i }));
    });

    await expect(refreshMock).toHaveBeenCalled();
    await expect(routerPushMock).toHaveBeenCalledWith('/');
  },
};
