import { ApiError, success, type HandlerContext, type RequestLike } from '../types.js';
import { getHandlerDeps } from '../context.js';

export async function getProfileHandler(
  _req: RequestLike,
  { params }: HandlerContext<unknown, { username: string }>
) {
  const { db } = getHandlerDeps();
  const { username } = params;
  const profile = await db.getDocument<any>('profiles', username);
  if (!profile) {
    throw new ApiError(404, 'Profile not found');
  }

  const allAuth = await db.getAllDocuments<any>('auth');
  const authRecord = allAuth.find((auth) => auth.data.username === username);

  return success({ ...profile, hasAccount: authRecord?.data.hasAccount !== false });
}
