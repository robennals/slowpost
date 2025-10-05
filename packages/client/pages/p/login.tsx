import { useRouter } from 'next/router';
import LoginFlow from '../../components/LoginFlow';
import { useAuth } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { refresh, setSession } = useAuth();

  return (
    <LoginFlow
      onComplete={async (username) => {
        setSession({ isLoggedIn: true, username });
        await refresh();
        await router.push('/');
      }}
    />
  );
}
