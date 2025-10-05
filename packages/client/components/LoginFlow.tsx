import { FormEvent, useState } from 'react';
import styles from './LoginFlow.module.css';

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
    <section className={styles.container}>
      <h1>Log in to Slowpost</h1>
      {step === 'email' && (
        <form className={styles.form} onSubmit={submitEmail}>
          <label className={styles.label}>
            Email address
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <button type="submit" className={styles.submitButton}>
            Send me a PIN
          </button>
        </form>
      )}
      {step === 'pin' && (
        <form className={styles.form} onSubmit={submitPin}>
          <label className={styles.label}>
            Enter the PIN we emailed you
            <input
              className={styles.input}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              required
            />
          </label>
          <button type="submit" className={styles.submitButton}>
            Verify PIN
          </button>
        </form>
      )}
      {step === 'username' && (
        <form className={styles.form} onSubmit={submitUsername}>
          <label className={styles.label}>
            Choose a username
            <input
              className={styles.input}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <button type="submit" className={styles.submitButton}>
            Finish
          </button>
        </form>
      )}
    </section>
  );
}

export default LoginFlow;
