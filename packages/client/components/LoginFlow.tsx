import { FormEvent, useState } from 'react';
import { Button, Card, HorizBox, PadBox, Text, TextInput, VertBox } from '../style';

type Step = 'email' | 'pin' | 'username';

type LoginFlowProps = {
  onComplete?: (username: string) => void;
};

const isDevEnvironment = process.env.NODE_ENV !== 'production';

export function LoginFlow({ onComplete }: LoginFlowProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestingPin, setRequestingPin] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [skippingPin, setSkippingPin] = useState(false);

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

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setRequestingPin(true);
    try {
      const response = await fetch('/api/login/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
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
          (isDevEnvironment
            ? 'PIN generated. Check the API server logs for the code.'
            : 'PIN sent. Please check your email.')
      );
      setStep('pin');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to request a login PIN.');
    } finally {
      setRequestingPin(false);
    }
  };

  const submitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pin) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setVerifyingPin(true);
    try {
      const response = await fetch('/api/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setUsername(suggestedUsername);
      setPin('');
      setStatusMessage('PIN verified! Choose a username to finish signing in.');
      setStep('username');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify the PIN.');
    } finally {
      setVerifyingPin(false);
    }
  };

  const skipPin = async () => {
    if (!isDevEnvironment || !email) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setSkippingPin(true);
    try {
      const response = await fetch('/api/login/dev-skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
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
      setUsername(suggestedUsername);
      setPin('');
      setStatusMessage('PIN skipped for development. Choose a username to finish signing in.');
      setStep('username');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to skip the PIN in development mode.');
    } finally {
      setSkippingPin(false);
    }
  };

  const submitUsername = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username) {
      onComplete?.(username);
    }
  };

  return (
    <Card tone="outline" maxWidth={420} margin="xl">
      <PadBox vert="xl" horiz="xl">
        <VertBox gap="lg">
          <h1>Log in to Slowpost</h1>
          {(errorMessage || statusMessage) && (
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
              <HorizBox justify="end">
                <Button shape="pill" type="submit" disabled={requestingPin}>
                  {requestingPin ? 'Sending…' : 'Send me a PIN'}
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
                    onClick={skipPin}
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
          {step === 'username' && (
            <VertBox as="form" gap="md" onSubmit={submitUsername}>
              <VertBox as="label" gap="sm">
                <Text as="span" weight="semibold" size="sm">
                  Choose a username
                </Text>
                <TextInput
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </VertBox>
              <HorizBox justify="end">
                <Button shape="pill" type="submit">
                  Finish
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
