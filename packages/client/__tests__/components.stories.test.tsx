import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as StatusBarStories from '../components/StatusBar.stories';
import * as FollowerListStories from '../components/FollowerList.stories';
import * as ProfileSummaryStories from '../components/ProfileSummary.stories';
import * as GroupMembersStories from '../components/GroupMembers.stories';
import * as FollowersPanelStories from '../components/FollowersPanel.stories';
import * as LoginFlowStories from '../components/LoginFlow.stories';
import { StatusBar } from '../components/StatusBar';
import { FollowerList } from '../components/FollowerList';
import { ProfileSummary } from '../components/ProfileSummary';
import { GroupMembers } from '../components/GroupMembers';
import FollowersPanel from '../components/FollowersPanel';
import { LoginFlow } from '../components/LoginFlow';

type StoryModule<TArgs> = {
  default: { args?: Partial<TArgs> };
};

function renderStory<TArgs>(
  story: { args?: Partial<TArgs>; render?: (args: TArgs) => React.ReactElement } | undefined,
  Component: React.ComponentType<TArgs>,
  meta: StoryModule<TArgs>['default']
) {
  const args = { ...(meta.args ?? {}), ...(story?.args ?? {}) } as TArgs;
  if (story?.render) {
    render(story.render(args));
  } else {
    render(<Component {...args} />);
  }
}

describe('Storybook components', () => {
  it('renders the logged out status bar', () => {
    renderStory(StatusBarStories.LoggedOut, StatusBar, StatusBarStories.default);
    expect(screen.getByText('Slowpost')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
  });

  it('renders close friend toggle in follower list', () => {
    renderStory(FollowerListStories.Default, FollowerList, FollowerListStories.default);
    const toggle = screen.getByLabelText(/close friends only/i);
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  it('shows edit profile button on own profile story', () => {
    renderStory(ProfileSummaryStories.OwnProfile, ProfileSummary, ProfileSummaryStories.default);
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('lists group members', () => {
    renderStory(GroupMembersStories.PrivateGroup, GroupMembers, GroupMembersStories.default);
    expect(screen.getByText('Request to join')).toBeInTheDocument();
  });

  it('lists follower requests', () => {
    renderStory(FollowersPanelStories.Default, FollowersPanel, FollowersPanelStories.default);
    expect(screen.getByRole('heading', { name: /follower requests/i })).toBeInTheDocument();
  });

  it('walks through the login flow', () => {
    renderStory(LoginFlowStories.Default, LoginFlow, LoginFlowStories.default);
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(emailInput.closest('form')!);
    const pinInput = screen.getByLabelText(/enter the pin/i);
    fireEvent.change(pinInput, { target: { value: '123456' } });
    fireEvent.submit(pinInput.closest('form')!);
    const usernameInput = screen.getByLabelText(/choose a username/i);
    expect(usernameInput).toBeInTheDocument();
  });
});
