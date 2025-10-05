import type { AppProps } from 'next/app';
import '../styles/globals.css';
import StatusBar from '../components/StatusBar';

export default function SlowpostApp({ Component, pageProps }: AppProps) {
  const { viewer } = pageProps as { viewer?: { username?: string } };
  const isLoggedIn = Boolean(viewer?.username);

  return (
    <>
      <StatusBar isLoggedIn={isLoggedIn} username={viewer?.username} />
      <main>
        <Component {...pageProps} />
      </main>
    </>
  );
}
