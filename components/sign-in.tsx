'use client';
import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { clientAuth, type ClientConfig } from '@/lib/client';

export function SignIn({ config, notice }: { config: ClientConfig; notice?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await signInWithEmailAndPassword(clientAuth(config), email, password);
    } catch {
      setMessage('We could not sign you in. Check your email and password.');
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setMessage('');
    if (!email) return setMessage('Enter your email address first.');
    try {
      await sendPasswordResetEmail(clientAuth(config), email);
      setMessage('If this account exists, a reset link has been sent.');
    } catch {
      setMessage('The reset request could not be completed.');
    }
  }
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#edf0f5', color: '#202958' }}>
      <form onSubmit={submit} style={{ width: 360, maxWidth: 'calc(100vw - 32px)', padding: 32, background: 'white', borderRadius: 12, display: 'grid', gap: 14 }}>
        <h1 style={{ margin: 0 }}>Care++</h1>
        <p style={{ margin: 0 }}>{notice || 'Sign in to your workspace.'}</p>
        {!config.apiKey && <p role="alert">Firebase sign-in is not configured for this installation.</p>}
        <label>Email<br /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} style={{ width: '100%', padding: 10 }} /></label>
        <label>Password<br /><input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} style={{ width: '100%', padding: 10 }} /></label>
        {message && <p role="status">{message}</p>}
        <button disabled={busy || !config.apiKey} style={{ padding: 11, color: 'white', background: '#202958', border: 0, borderRadius: 5 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" onClick={reset} disabled={!config.apiKey} style={{ background: 'none', border: 0, color: '#202958', cursor: 'pointer' }}>Reset password</button>
      </form>
    </main>
  );
}
