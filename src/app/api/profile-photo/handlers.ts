import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';
import { ApiError, requireUser, success, type Handler } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getExtension(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export const uploadProfilePhotoHandler: Handler<{ image?: string }> = async (_req, ctx) => {
  const user = requireUser(ctx);
  const { db } = getHandlerDeps();
  const image = ctx.body?.image;

  if (!image || typeof image !== 'string') {
    throw new ApiError(400, 'Image is required');
  }

  const match = image.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new ApiError(400, 'Invalid image format');
  }

  const [, mimeType, base64Data] = match;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ApiError(400, 'Unsupported image type');
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (!buffer.length) {
    throw new ApiError(400, 'Invalid image data');
  }

  const extension = getExtension(mimeType);
  const fileName = `profiles/${user.username}-${randomUUID()}.${extension}`;

  const result = await put(fileName, buffer, {
    access: 'public',
    contentType: mimeType,
  });

  await db.updateDocument('profiles', user.username, { photoUrl: result.url });
  const updatedProfile = await db.getDocument('profiles', user.username);

  return success({ photoUrl: result.url, profile: updatedProfile });
};
