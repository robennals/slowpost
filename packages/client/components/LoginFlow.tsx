import { FormEvent, useState } from 'react';
import { Button, Card, HorizBox, PadBox, Text, TextInput, VertBox } from '../style';

type Step = 'email' | 'status' | 'pin' | 'signupDetails';
type StatusKind = 'success' | 'error' | null;
type Mode = 'login' | 'signup';

type LoginFlowProps = {
  onComplete?: (username: string) => void;
};

const isDevEnvironment = process.env.NODE_ENV !== 'production';

export function LoginFlow({ onComplete }: LoginFlowProps) {
  const [step, setStep] = useState<Step>('email');
  const [mode, setMode] = useState<Mode>('login');
  const [intent, setIntent] = useState<Mode | null>(null);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestingPin, setRequestingPin] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [skippingPin, setSkippingPin] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [statusKind, setStatusKind] = useState<StatusKind>(null);
  const [showSignupHint, setShowSignupHint] = useState(false);

  const readError = async (response: Response): Promise<never> => {
    try {
      const data = await response.json();
      if (data && typeof data.message === 'string') {
        throw new Error(data.message);
      }
    } catch {
      // ignore body parsing errors and fall back to a generic status message
    }
    throw new Error(response.statusText || 'Request failed');
  };

  const resetStatus = () => {
    setStatusKind(null);
    setStatusMessage(null);
    setErrorMessage(null);
    setShowSignupHint(false);
  };

  const switchMode = (nextMode: Mode) => {
    if (mode === nextMode) {
      return;
    }
    setMode(nextMode);
    setStep('email');
    setIntent(null);
    setPin('');
    setUsername('');
    setName('');
    resetStatus();
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setStatusKind(null);
    setShowSignupHint(false);
    setIntent(null);
    setRequestingPin(true);
    try {
      const endpoint = mode === 'login' ? '/api/login/request' : '/api/signup/request';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        if (mode === 'login' && response.status === 404) {
          setShowSignupHint(true);
        }
        await readError(response);
      }
      let message: string | undefined;
      try {
        const payload = (await response.json()) as { message?: string };
        message = payload?.message;
      } catch {
        message = undefined;
      }
      setStatusMessage(
        message ??
          (mode === 'login'
            ? isDevEnvironment
              ? 'PIN generated. Check the API server logs for the code.'
              : 'PIN sent. Please check your email.'
            : isDevEnvironment
            ? 'PIN generated. Check the API server logs for the code.'
            : 'PIN sent. Check your email to continue signing up.')
      );
      setStatusKind('success');
      setStep('status');
      setIntent(mode);
      setUsername('');
      setName('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send a PIN.');
      setStatusMessage(null);
      setStatusKind('error');
      setStep('status');
    } finally {
      setRequestingPin(false);
    }
  };

  const submitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pin || !intent) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setStatusKind(null);
    setVerifyingPin(true);
    try {
      const endpoint = intent === 'login' ? '/api/login/verify' : '/api/signup/verify';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, pin })
      });
      if (!response.ok) {
        await readError(response);
      }
      let suggestedUsername = email.split('@')[0] ?? '';
      try {
        const payload = (await response.json()) as { username?: string };
        if (payload?.username) {
          suggestedUsername = payload.username;
        }
      } catch {
        // ignore parsing errors and fall back to the email prefix
      }
      setPin('');
      if (intent === 'login') {
        onComplete?.(suggestedUsername);
        return;
      }
      setUsername(suggestedUsername);
      setStatusMessage('PIN verified! Choose a username and add your name to finish creating your account.');
      setStatusKind('success');
      setStep('signupDetails');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify the PIN.');
    } finally {
      setVerifyingPin(false);
    }
  };

  const skipPin = async (overrideIntent?: Mode) => {
    const activeIntent = overrideIntent ?? intent;
    if (!isDevEnvironment || !email || !activeIntent) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setStatusKind(null);
    setSkippingPin(true);
    try {
      const response = await fetch('/api/login/dev-skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, intent: activeIntent })
      });
      if (!response.ok) {
        await readError(response);
      }
      let suggestedUsername = email.split('@')[0] ?? '';
      try {
        const payload = (await response.json()) as { username?: string };
        if (payload?.username) {
          suggestedUsername = payload.username;
        }
      } catch {
        // ignore parsing errors and fall back to the email prefix
      }
      setPin('');
      if (activeIntent === 'login') {
        setIntent('login');
        onComplete?.(suggestedUsername);
        return;
      }
      setUsername(suggestedUsername);
      setStatusMessage('PIN skipped for development. Choose a username and add your name to finish creating your account.');
      setStatusKind('success');
      setStep('signupDetails');
      setIntent('signup');
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        setErrorMessage('Skipping the PIN is only available when Slowpost is running locally.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to skip the PIN in development mode.');
      }
    } finally {
      setSkippingPin(false);
    }
  };

  const submitSignupDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !name || !email) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setStatusKind(null);
    setCreatingAccount(true);
    try {
      const response = await fetch('/api/signup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, username, name })
      });
      if (!response.ok) {
        await readError(response);
      }
      let finalUsername = username;
      try {
        const payload = (await response.json()) as { username?: string };
        if (payload?.username) {
          finalUsername = payload.username;
        }
      } catch {
        finalUsername = username;
      }
      onComplete?.(finalUsername);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account.');
    } finally {
      setCreatingAccount(false);
    }
  };

  const profileUrlPreview = username ? `slowpost.org/${username}` : 'slowpost.org/your-name';

  return (
    <Card tone="outline" maxWidth={420} margin="xl">
      <PadBox vert="xl" horiz="xl">
        <VertBox gap="lg">
          <HorizBox spread align="center">
            <h1>{mode === 'login' ? 'Log in to Slowpost' : 'Sign up for Slowpost'}</h1>
            <Button
              shape="pill"
              tone="muted"
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </Button>
          </HorizBox>
          {step !== 'status' && (errorMessage || statusMessage) && (
            <VertBox gap="xs">
              {errorMessage && (
                <Text size="sm" tone="copper">
                  {errorMessage}
                </Text>
              )}
              {statusMessage && (
                <Text size="sm" tone="muted">
                  {statusMessage}
                </Text>
              )}
            </VertBox>
          )}
          {step === 'email' && (
            <VertBox as="form" gap="md" onSubmit={submitEmail}>
              <VertBox as="label" gap="sm">
                <Text as="span" weight="semibold" size="sm">
                  Email address
                </Text>
                <TextInput
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </VertBox>
              <HorizBox justify="end" gap="sm">
                {isDevEnvironment && (
                  <Button
                    tone="muted"
                    shape="pill"
                    type="button"
                    onClick={() => {
                      if (!email || requestingPin) {
                        return;
                      }
                      skipPin(mode);
                    }}
                    disabled={!email || skippingPin || requestingPin}
                  >
                    {skippingPin ? 'Skipping…' : 'Skip PIN'}
                  </Button>
                )}
                <Button shape="pill" type="submit" disabled={requestingPin}>
                  {requestingPin ? 'Sending…' : mode === 'login' ? 'Send me a PIN' : 'Send signup PIN'}
                </Button>
              </HorizBox>
            </VertBox>
          )}
          {step === 'status' && (
            <VertBox gap="md">
              {statusKind === 'success' ? (
                <Text size="sm" tone="muted">
                  {statusMessage ??
                    (intent === 'signup'
                      ? isDevEnvironment
                        ? 'PIN generated. Check the API server logs for the code.'
                        : 'PIN sent. Check your email to continue signing up.'
                      : isDevEnvironment
                      ? 'PIN generated. Check the API server logs for the code.'
                      : 'PIN sent. Please check your email.')}
                </Text>
              ) : (
                <VertBox gap="sm">
                  <Text size="sm" tone="copper">
                    {errorMessage ?? 'Unable to request a PIN. Please try again.'}
                  </Text>
                  {showSignupHint && (
                    <Button shape="pill" type="button" onClick={() => switchMode('signup')}>
                      Sign up instead
                    </Button>
                  )}
                </VertBox>
              )}
              <HorizBox justify="end">
                <Button
                  shape="pill"
                  type="button"
                  onClick={() => {
                    if (statusKind === 'success') {
                      resetStatus();
                      setStep('pin');
                    } else {
                      resetStatus();
                      setStep('email');
                    }
                  }}
                >
                  {statusKind === 'success' ? 'Enter PIN' : 'Try again'}
                </Button>
              </HorizBox>
            </VertBox>
          )}
          {step === 'pin' && (
            <VertBox as="form" gap="md" onSubmit={submitPin}>
              <VertBox as="label" gap="sm">
                <Text as="span" weight="semibold" size="sm">
                  Enter the PIN we emailed you
                </Text>
                <TextInput
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  required
                />
              </VertBox>
              <HorizBox justify="end" gap="sm">
                {isDevEnvironment && (
                  <Button
                    tone="muted"
                    shape="pill"
                    type="button"
                    onClick={() => skipPin()}
                    disabled={skippingPin || verifyingPin}
                  >
                    {skippingPin ? 'Skipping…' : 'Skip PIN'}
                  </Button>
                )}
                <Button shape="pill" type="submit" disabled={verifyingPin}>
                  {verifyingPin ? 'Verifying…' : 'Verify PIN'}
                </Button>
              </HorizBox>
            </VertBox>
          )}
          {step === 'signupDetails' && (
            <VertBox as="form" gap="md" onSubmit={submitSignupDetails}>
              <VertBox gap="sm">
                <VertBox as="label" gap="sm">
                  <Text as="span" weight="semibold" size="sm">
                    Choose a username
                  </Text>
                  <TextInput
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                    }
                    required
                  />
                </VertBox>
                <Text size="sm" tone="muted">
                  Your profile URL will be {profileUrlPreview}
                </Text>
              </VertBox>
              <VertBox as="label" gap="sm">
                <Text as="span" weight="semibold" size="sm">
                  Your name
                </Text>
                <TextInput value={name} onChange={(event) => setName(event.target.value)} required />
              </VertBox>
              <HorizBox justify="end">
                <Button shape="pill" type="submit" disabled={creatingAccount}>
                  {creatingAccount ? 'Creating…' : 'Create account'}
                </Button>
              </HorizBox>
            </VertBox>
          )}
        </VertBox>
      </PadBox>
    </Card>
  );
}

export default LoginFlow;
