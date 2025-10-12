'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestPin, login, signup, subscribeToUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import styles from './login.module.css';

type Step = 'email' | 'pin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresSignup, setRequiresSignup] = useState(false);
  const [devPin, setDevPin] = useState('');

  const handleRedirectAfterLogin = async () => {
    const redirectUrl = localStorage.getItem('redirectAfterLogin');
    if (redirectUrl) {
      localStorage.removeItem('redirectAfterLogin');
      if (redirectUrl.startsWith('/subscribe/')) {
        const username = redirectUrl.replace('/subscribe/', '');
        try {
          await subscribeToUser(username);
          router.push(`/${username}`);
          return true;
        } catch (error) {
          console.error('Failed to auto-subscribe:', error);
        }
      }
    }
    return false;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await requestPin(email);
      if (result.error) {
        setError(result.error);
        return;
      }

      setRequiresSignup(result.requiresSignup);

      // In development, show the PIN
      if (result.pin) {
        setDevPin(result.pin);
      }

      if (result.requiresSignup) {
        setStep('signup');
      } else {
        setStep('pin');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request PIN');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, pin);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        await refreshUser();
        const didRedirect = await handleRedirectAfterLogin();
        if (!didRedirect) {
          router.push('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPin = async () => {
    setPin('skip');
    setError('');
    setLoading(true);

    try {
      const result = await login(email, 'skip');
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        await refreshUser();
        const didRedirect = await handleRedirectAfterLogin();
        if (!didRedirect) {
          router.push('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signup(email, username, fullName, pin);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        await refreshUser();
        const didRedirect = await handleRedirectAfterLogin();
        if (!didRedirect) {
          router.push('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSkipPin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signup(email, username, fullName, 'skip');
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        await refreshUser();
        const didRedirect = await handleRedirectAfterLogin();
        if (!didRedirect) {
          router.push('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Slowpost</h1>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className={styles.form}>
            <p className={styles.description}>Enter your email to get started</p>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
            />
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Sending...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'pin' && (
          <form onSubmit={handlePinSubmit} className={styles.form}>
            <p className={styles.description}>Enter the PIN sent to {email}</p>
            {devPin && (
              <div className={styles.devInfo}>
                Development PIN: <strong>{devPin}</strong>
              </div>
            )}
            <input
              type="text"
              placeholder="Enter 6-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={styles.input}
              maxLength={6}
              required
              disabled={loading}
            />
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Verifying...' : 'Log In'}
            </button>
            {devPin && (
              <button
                type="button"
                onClick={handleSkipPin}
                className={styles.skipButton}
                disabled={loading}
              >
                Skip PIN (localhost only)
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep('email')}
              className={styles.backButton}
              disabled={loading}
            >
              Back
            </button>
          </form>
        )}

        {step === 'signup' && (
          <form onSubmit={handleSignupSubmit} className={styles.form}>
            <p className={styles.description}>Create your account</p>
            {devPin && (
              <div className={styles.devInfo}>
                Development PIN: <strong>{devPin}</strong>
              </div>
            )}
            <input
              type="text"
              placeholder="Username (e.g., johndoe)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Enter 6-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={styles.input}
              maxLength={6}
              required
              disabled={loading}
            />
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
            {devPin && (
              <button
                type="button"
                onClick={handleSignupSkipPin}
                className={styles.skipButton}
                disabled={loading}
              >
                Skip PIN (localhost only)
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep('email')}
              className={styles.backButton}
              disabled={loading}
            >
              Back
            </button>
          </form>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}
