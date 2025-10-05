import { FormEvent, useState } from 'react';
import { Button, Card, HorizBox, PadBox, Text, TextInput, VertBox } from '../style';

type Step = 'email' | 'pin' | 'username';

type LoginFlowProps = {
  onComplete?: (username: string) => void;
};

export function LoginFlow({ onComplete }: LoginFlowProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    if (email) {
      setStep('pin');
    }
  };

  const submitPin = (event: FormEvent) => {
    event.preventDefault();
    if (pin.length >= 6) {
      setStep('username');
    }
  };

  const submitUsername = (event: FormEvent) => {
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
                <Button shape="pill">Send me a PIN</Button>
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
              <HorizBox justify="end">
                <Button shape="pill">Verify PIN</Button>
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
                <Button shape="pill">Finish</Button>
              </HorizBox>
            </VertBox>
          )}
        </VertBox>
      </PadBox>
    </Card>
  );
}

export default LoginFlow;
