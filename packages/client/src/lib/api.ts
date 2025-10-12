const API_BASE = '/api';

export async function requestPin(email: string) {
  const res = await fetch(`${API_BASE}/auth/request-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    credentials: 'include',
  });
  return res.json();
}

export async function login(email: string, pin: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pin }),
    credentials: 'include',
  });
  return res.json();
}

export async function signup(email: string, username: string, fullName: string, pin: string) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, fullName, pin }),
    credentials: 'include',
  });
  return res.json();
}

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function logout() {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

export async function getProfile(username: string) {
  const res = await fetch(`${API_BASE}/profiles/${username}`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateProfile(username: string, updates: { fullName?: string; bio?: string; photoUrl?: string }) {
  const res = await fetch(`${API_BASE}/profiles/${username}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
    credentials: 'include',
  });
  return res.json();
}

export async function getFollowers(username: string) {
  const res = await fetch(`${API_BASE}/followers/${username}`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function followUser(username: string) {
  const res = await fetch(`${API_BASE}/followers/${username}`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

export async function updateFollower(username: string, followerUsername: string, isClose: boolean) {
  const res = await fetch(`${API_BASE}/followers/${username}/${followerUsername}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isClose }),
    credentials: 'include',
  });
  return res.json();
}

export async function unfollowUser(username: string, followerUsername: string) {
  const res = await fetch(`${API_BASE}/followers/${username}/${followerUsername}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

export async function getUserGroups(username: string) {
  const res = await fetch(`${API_BASE}/groups/user/${username}`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getGroup(groupName: string) {
  const res = await fetch(`${API_BASE}/groups/${groupName}`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function createGroup(groupName: string, displayName: string, description: string, isPublic: boolean) {
  const res = await fetch(`${API_BASE}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupName, displayName, description, isPublic }),
    credentials: 'include',
  });
  return res.json();
}

export async function joinGroup(groupName: string, groupBio: string) {
  const res = await fetch(`${API_BASE}/groups/${groupName}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupBio }),
    credentials: 'include',
  });
  return res.json();
}

export async function updateGroupBio(groupName: string, username: string, groupBio: string) {
  const res = await fetch(`${API_BASE}/groups/${groupName}/members/${username}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupBio }),
    credentials: 'include',
  });
  return res.json();
}

export async function leaveGroup(groupName: string, username: string) {
  const res = await fetch(`${API_BASE}/groups/${groupName}/members/${username}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}
