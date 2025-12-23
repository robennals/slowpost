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

export async function signup(email: string, username: string, fullName: string, pin: string, planToSend?: boolean) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, fullName, pin, planToSend }),
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

export async function updateProfile(username: string, updates: { fullName?: string; bio?: string; photoUrl?: string; expectedSendMonth?: string; planToSend?: boolean }) {
  const res = await fetch(`${API_BASE}/profiles/${username}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
    credentials: 'include',
  });
  return res.json();
}

export async function markLetterSent(username: string) {
  const res = await fetch(`${API_BASE}/profiles/${username}/mark-sent`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

export async function uploadProfilePhoto(image: string) {
  const res = await fetch(`${API_BASE}/profile-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
    credentials: 'include',
  });
  return res.json();
}

export async function getSubscribers(username: string) {
  const res = await fetch(`${API_BASE}/subscribers/${username}`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getSubscriptions(username: string) {
  const res = await fetch(`${API_BASE}/subscriptions/${username}`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function subscribeToUser(username: string) {
  const res = await fetch(`${API_BASE}/subscribers/${username}`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

export async function addSubscriberByEmail(username: string, email: string, fullName?: string) {
  const res = await fetch(`${API_BASE}/subscribers/${username}/add-by-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, fullName }),
    credentials: 'include',
  });
  return res.json();
}

export async function addSubscribersByEmail(username: string, emails: Array<{ email: string; fullName?: string }>) {
  const res = await fetch(`${API_BASE}/subscribers/${username}/add-by-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails }),
    credentials: 'include',
  });
  return res.json();
}

export async function checkExistingSubscribers(username: string, emails: string[]) {
  const res = await fetch(`${API_BASE}/subscribers/${username}/check-existing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails }),
    credentials: 'include',
  });
  return res.json();
}

export async function updateSubscriber(username: string, subscriberUsername: string, isClose: boolean) {
  const res = await fetch(`${API_BASE}/subscribers/${username}/${subscriberUsername}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isClose }),
    credentials: 'include',
  });
  return res.json();
}

export async function confirmSubscription(username: string, subscriberUsername: string) {
  const res = await fetch(`${API_BASE}/subscribers/${username}/${subscriberUsername}/confirm`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

export async function unsubscribeFromUser(username: string, subscriberUsername: string) {
  const res = await fetch(`${API_BASE}/subscribers/${username}/${subscriberUsername}`, {
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

export async function updateGroup(groupName: string, updates: { isPublic?: boolean; displayName?: string; description?: string }) {
  const res = await fetch(`${API_BASE}/groups/${groupName}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
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

export async function updateMemberStatus(groupName: string, username: string, status: 'pending' | 'approved') {
  const res = await fetch(`${API_BASE}/groups/${groupName}/members/${username}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'include',
  });
  return res.json();
}

export async function toggleMemberAdmin(groupName: string, username: string, isAdmin: boolean) {
  const res = await fetch(`${API_BASE}/groups/${groupName}/members/${username}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAdmin }),
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

export async function getUpdates(username: string) {
  const res = await fetch(`${API_BASE}/updates/${username}`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  return res.json();
}
