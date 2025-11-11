import { success, type Handler } from '@/server/api/types';
import { CLEAR_AUTH_COOKIE } from '@/server/api/utils';

export const logoutHandler: Handler = async () => {
  return success(
    { success: true },
    {
      cookies: CLEAR_AUTH_COOKIE,
    }
  );
};
