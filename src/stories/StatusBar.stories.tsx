import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within, fn } from '@storybook/test';
import StatusBar from '@/components/StatusBar';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';

const meta: Meta<typeof StatusBar> = {
  title: 'Components/StatusBar',
  component: StatusBar,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

function renderWithAuth(value: AuthContextType) {
  return (
    <AuthContext.Provider value={value}>
      <StatusBar />
    </AuthContext.Provider>
  );
}

export const LoggedOut: Story = {
  render: () =>
    renderWithAuth({
      user: null,
      loading: false,
      refreshUser: async () => undefined,
      logout: async () => undefined,
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Slowpost')).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: /log in/i })).toBeInTheDocument();
  },
};

const logoutMock = fn();

export const LoggedIn: Story = {
  render: () => {
    logoutMock.mockClear();
    return renderWithAuth({
      user: { username: 'jane', fullName: 'Jane Doe' },
      loading: false,
      refreshUser: async () => undefined,
      logout: async () => {
        logoutMock();
      },
    });
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Jane Doe')).toBeInTheDocument();
    await step('Log out when clicking the button', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /log out/i }));
      await expect(logoutMock).toHaveBeenCalled();
    });
  },
};
