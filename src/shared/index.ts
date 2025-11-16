// Shared types between client and server

export interface Profile {
  username: string;
  fullName: string;
  bio: string;
  photoUrl?: string;
  email?: string;
  expectedSendMonth?: string; // e.g., "January", "December", etc.
  lastSentDate?: string; // ISO date string of when they last marked letter as sent
  lastReminderSentDate?: string; // ISO date string of when initial reminder was sent
  lastFollowUpSentDate?: string; // ISO date string of when follow-up reminder was sent
  planToSend?: boolean; // Whether user plans to send annual letters
}

export interface Group {
  groupName: string;
  displayName: string;
  description: string;
  adminUsername: string;
  isPublic: boolean;
}

export interface Subscription {
  subscriberUsername: string;
  subscribedToUsername: string;
  isClose: boolean;
  addedBy?: string; // Who initiated the subscription (subscriberUsername or subscribedToUsername)
  confirmed?: boolean; // Whether subscriber confirmed (for email-added subscriptions)
}

export interface Member {
  groupName: string;
  username: string;
  groupBio: string;
  status: 'pending' | 'approved';
  isAdmin: boolean;
}

export interface Notification {
  id: string;
  username: string;
  type: 'follow' | 'group_request' | 'group_accepted';
  fromUsername: string;
  groupName?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AuthSession {
  username: string;
  fullName: string;
  token: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  pin?: string;
}

export interface LoginResponse {
  success: boolean;
  session?: AuthSession;
  requiresPin?: boolean;
  isNewUser?: boolean;
  error?: string;
}

export interface SignupRequest {
  email: string;
  username: string;
  fullName: string;
  pin?: string;
  planToSend?: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
}
