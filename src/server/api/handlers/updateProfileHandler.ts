import { ApiError, success, type HandlerContext, type RequestLike } from '../types';
import { requireUser } from '../types';
import { getHandlerDeps } from '../context';

export async function updateProfileHandler(
  _req: RequestLike,
  ctx: HandlerContext<{ fullName?: string; bio?: string; photoUrl?: string }, { username: string }>
) {
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
}
