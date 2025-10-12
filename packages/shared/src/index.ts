// Shared types between client and server

export interface Profile {
  username: string;
  fullName: string;
  bio: string;
  photoUrl?: string;
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
}

export interface Member {
  groupName: string;
  username: string;
  groupBio: string;
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
}

export interface ApiError {
  error: string;
  code?: string;
}
