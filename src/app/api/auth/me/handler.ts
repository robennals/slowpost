import { requireUser, success, type Handler } from '@/server/api/types';

export const currentUserHandler: Handler = async (_req, ctx) => {
  const user = requireUser(ctx);
  return success({ username: user.username, fullName: user.fullName });
};
