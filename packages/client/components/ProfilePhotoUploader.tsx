import { ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { Avatar, Button, Text, VertBox } from '../style';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface ProfilePhotoUploaderProps {
  username: string;
  name: string;
  initialPhotoUrl: string;
  onPhotoUpdated?: (photoUrl: string) => void;
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read the selected file.'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Could not read the selected file.'));
    };
    reader.readAsDataURL(file);
  });
}

export function ProfilePhotoUploader({
  username,
  name,
  initialPhotoUrl,
  onPhotoUpdated
}: ProfilePhotoUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPhotoUrl(initialPhotoUrl);
  }, [initialPhotoUrl]);

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setStatus('error');
      setMessage('Please choose an image file.');
      resetInput();
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatus('error');
      setMessage('Please choose an image smaller than 5MB.');
      resetInput();
      return;
    }

    setStatus('uploading');
    setMessage('Uploading photo…');

    try {
      const photoData = await readFileAsDataUrl(file);
      const response = await fetch(`/api/profile/${username}/photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoData })
      });
      if (!response.ok) {
        let errorMessage = 'Unable to upload your photo. Please try again.';
        try {
          const errorJson = (await response.json()) as { message?: string };
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (parseError) {
          console.warn('Unable to parse photo upload error response', parseError);
        }
        throw new Error(errorMessage);
      }
      const data = (await response.json()) as { photoUrl: string };
      setPhotoUrl(data.photoUrl);
      onPhotoUpdated?.(data.photoUrl);
      setStatus('success');
      setMessage('Profile photo updated.');
    } catch (error) {
      console.error('Failed to upload profile photo', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to upload your photo.');
    } finally {
      resetInput();
    }
  };

  return (
    <VertBox gap="xs" align="center">
      <Avatar src={photoUrl} alt={name} size={96} tone="bold" />
      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Button onClick={handleSelectFile}>Change photo</Button>
      {message ? (
        <Text as="p" size="sm" tone={status === 'error' ? 'copper' : 'muted'} aria-live="polite">
          {message}
        </Text>
      ) : null}
    </VertBox>
  );
}

export default ProfilePhotoUploader;
