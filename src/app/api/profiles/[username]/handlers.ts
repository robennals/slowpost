import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const getProfileHandler: Handler<unknown, { username: string }> = async (_req, { params }) => {
  const { db } = getHandlerDeps();
  const { username } = params;
  const profile = await db.getDocument<any>('profiles', username);
  if (!profile) {
    throw new ApiError(404, 'Profile not found');
  }

  const allAuth = await db.getAllDocuments<any>('auth');
  const authRecord = allAuth.find((auth) => auth.data.username === username);

  return success({ ...profile, hasAccount: authRecord?.data.hasAccount !== false });
};

export const updateProfileHandler: Handler<
  { fullName?: string; bio?: string; photoUrl?: string },
  { username: string }
> = async (_req, ctx) => {
  const { db } = getHandlerDeps();
  const user = requireUser(ctx);
  const { username } = ctx.params;
  if (user.username !== username) {
    throw new ApiError(403, 'You can only edit your own profile');
  }

  const updates: Record<string, unknown> = {};
  if (ctx.body?.fullName !== undefined) updates.fullName = ctx.body.fullName;
  if (ctx.body?.bio !== undefined) updates.bio = ctx.body.bio;
  if (ctx.body?.photoUrl !== undefined) updates.photoUrl = ctx.body.photoUrl;

  await db.updateDocument('profiles', username, updates);
  const updatedProfile = await db.getDocument('profiles', username);
  return success(updatedProfile);
};
