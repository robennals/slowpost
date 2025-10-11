import Head from 'next/head';
import Link from 'next/link';
import { FollowerList } from '../components/FollowerList';
import { useAuth } from '../lib/auth';
import { sampleHome } from '../lib/data';

export default function HomePage() {
  const { isLoggedIn } = useAuth();
  return (
    <>
      <Head>
        <title>Slowpost</title>
      </Head>
      {!isLoggedIn ? (
        <section style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h1>Post once a year. Stay close forever.</h1>
          <p>Slowpost helps you keep in touch without the scroll. Log in to see who is waiting.</p>
          <Link href="/p/login" className="buttonLink">
            Log in
          </Link>
        </section>
      ) : (
        <>
          <FollowerList followers={sampleHome.followers} />
          <section style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <button type="button" style={{ padding: '0.75rem 1.5rem', borderRadius: '999px' }}>
              Export close friends for email
            </button>
          </section>
        </>
      )}
    </>
  );
}
