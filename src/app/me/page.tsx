'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function MePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      router.replace(`/${user.username}`);
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecting...</p>
    </div>
  );
}
