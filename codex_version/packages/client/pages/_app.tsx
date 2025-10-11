import type { AppProps } from 'next/app';
import '../styles/globals.css';
import StatusBar from '../components/StatusBar';
import { AuthProvider, useAuth } from '../lib/auth';

function AppLayout({ Component, pageProps }: AppProps) {
  const { isLoggedIn, username } = useAuth();

  return (
    <>
      <StatusBar isLoggedIn={isLoggedIn} username={username} />
      <main>
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default function SlowpostApp(appProps: AppProps) {
  return (
    <AuthProvider>
      <AppLayout {...appProps} />
    </AuthProvider>
  );
}
