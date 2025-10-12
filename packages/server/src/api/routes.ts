import {
  requestPinHandler,
  loginHandler,
  signupHandler,
  currentUserHandler,
  logoutHandler,
  getProfileHandler,
  updateProfileHandler,
  getUpdatesHandler,
  getSubscribersHandler,
  getSubscriptionsHandler,
  subscribeHandler,
  addSubscriberByEmailHandler,
  updateSubscriberHandler,
  confirmSubscriptionHandler,
  unsubscribeHandler,
  getUserGroupsHandler,
  getGroupHandler,
  createGroupHandler,
  joinGroupHandler,
  updateGroupMemberHandler,
  leaveGroupHandler,
} from './handlers/index.js';
import type { Handler } from './types.js';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: Handler<any, any>;
  requireAuth?: boolean;
}

export const routes: RouteDefinition[] = [
  { method: 'POST', path: '/api/auth/request-pin', handler: requestPinHandler },
  { method: 'POST', path: '/api/auth/login', handler: loginHandler },
  { method: 'POST', path: '/api/auth/signup', handler: signupHandler },
  { method: 'GET', path: '/api/auth/me', handler: currentUserHandler, requireAuth: true },
  { method: 'POST', path: '/api/auth/logout', handler: logoutHandler },

  { method: 'GET', path: '/api/profiles/:username', handler: getProfileHandler },
  { method: 'PUT', path: '/api/profiles/:username', handler: updateProfileHandler, requireAuth: true },

  { method: 'GET', path: '/api/updates/:username', handler: getUpdatesHandler },

  { method: 'GET', path: '/api/subscribers/:username', handler: getSubscribersHandler },
  { method: 'GET', path: '/api/subscriptions/:username', handler: getSubscriptionsHandler },
  { method: 'POST', path: '/api/subscribers/:username', handler: subscribeHandler, requireAuth: true },
  {
    method: 'POST',
    path: '/api/subscribers/:username/add-by-email',
    handler: addSubscriberByEmailHandler,
    requireAuth: true,
  },
  {
    method: 'PUT',
    path: '/api/subscribers/:username/:subscriberUsername',
    handler: updateSubscriberHandler,
    requireAuth: true,
  },
  {
    method: 'DELETE',
    path: '/api/subscribers/:username/:subscriberUsername',
    handler: unsubscribeHandler,
    requireAuth: true,
  },
  {
    method: 'POST',
    path: '/api/subscribers/:username/:subscriberUsername/confirm',
    handler: confirmSubscriptionHandler,
    requireAuth: true,
  },

  { method: 'GET', path: '/api/groups/user/:username', handler: getUserGroupsHandler },
  { method: 'GET', path: '/api/groups/:groupName', handler: getGroupHandler },
  { method: 'POST', path: '/api/groups', handler: createGroupHandler, requireAuth: true },
  { method: 'POST', path: '/api/groups/:groupName/join', handler: joinGroupHandler, requireAuth: true },
  {
    method: 'PUT',
    path: '/api/groups/:groupName/members/:username',
    handler: updateGroupMemberHandler,
    requireAuth: true,
  },
  {
    method: 'DELETE',
    path: '/api/groups/:groupName/members/:username',
    handler: leaveGroupHandler,
    requireAuth: true,
  },
];
