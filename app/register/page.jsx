'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, Users, Building2, Eye, EyeOff, Check, Loader2, ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '@/lib/clientApi';
import {
  isValidPassword, NAME_MAX, PASSWORD_MIN,
} from '@/lib/validation';
import styles from './register.module.css';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const ROLES = [
  {
    value: 'PLAYER',
    label: 'Player',
    desc: 'For anyone who wants to get on the pitch.',
    Icon: Users,
    points: ['Find sports venues', 'Book courts and turfs', 'Join games and meet players'],
  },
  {
    value: 'VENDOR',
    label: 'Ground Owner',
    desc: 'For venues that want to fill every slot.',
    Icon: Building2,
    points: ['List your sports venue', 'Manage bookings and slots', 'Grow your sports business'],
  },
];

const STRENGTH_LEVELS = [
  { label: 'Too weak', className: styles.strengthBarOn1 },
  { label: 'Weak', className: styles.strengthBarOn1 },
  { label: 'Fair', className: styles.strengthBarOn2 },
  { label: 'Good', className: styles.strengthBarOn3 },
  { label: 'Strong', className: styles.strengthBarOn4 },
];

/** 0–4 password score: length, mixed case, digits, symbols. */
function passwordStrength(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= PASSWORD_MIN) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(4, score);
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('PLAYER');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const submitControllerRef = React.useRef(null);

  React.useEffect(() => {
    // Honour ?role=VENDOR from the "List Your Ground" landing page.
    try {
      const requested = new URLSearchParams(window.location.search).get('role');
      if (requested === 'VENDOR') setRole('VENDOR');
    } catch { /* no URL scope */ }
    return () => {
      if (submitControllerRef.current) submitControllerRef.current.abort();
    };
  }, []);

  // Mirror the server's rules so the user gets the error before a round-trip.
  const validate = useCallback(() => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) errors.name = 'Enter your full name.';
    else if (trimmedName.length > NAME_MAX) errors.name = `Name must be at most ${NAME_MAX} characters.`;

    if (!trimmedEmail) errors.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(trimmedEmail)) errors.email = 'Enter a valid email address.';

    if (!password) errors.password = 'Create a password.';
    else if (!isValidPassword(password)) errors.password = `Use at least ${PASSWORD_MIN} characters.`;

    if (!confirmPassword) errors.confirmPassword = 'Confirm your password.';
    else if (password && confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';

    return errors;
  }, [name, email, password, confirmPassword]);

  const errors = validate();
  const showError = (field) => (submitAttempted || touched[field]) && errors[field];

  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setSubmitAttempted(true);
    setError('');
    if (Object.keys(errors).length > 0) return;

    if (submitControllerRef.current) submitControllerRef.current.abort();
    submitControllerRef.current = new AbortController();
    const signal = submitControllerRef.current.signal;

    setLoading(true);
    try {
      // The API still requires a username: derive one from the email prefix so
      // the user never has to invent one. Slug the local part, cap at 24 chars
      // plus a 4-digit suffix (always ≤ 32), dots/underscores kept valid.
      const emailPrefix = email.trim().split('@')[0] || 'player';
      const slug = emailPrefix.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 24) || 'player';
      const username = `${slug}${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password, role }),
        signal,
      });

      if (res.ok) {
        setSuccess(true);
        // Sign the new account straight in and land them in the app, instead of
        // bouncing to /login for a second step.
        const result = await signIn('credentials', { redirect: false, username, password });
        if (result?.error) {
          router.push('/login');
        } else {
          const session = await getSession();
          if (session?.user?.role === 'VENDOR') router.push('/vendor');
          else router.push('/');
          router.refresh();
        }
      } else {
        const data = await res.json();
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    if (googleLoading || loading) return;
    setGoogleLoading(true);
    // Remember the chosen role so the Google callback can honour it (PLAYER/VENDOR).
    try {
      document.cookie = `sportferry_oauth_role=${role}; path=/; max-age=900; samesite=lax`;
    } catch { /* ignore */ }
    signIn('google', { callbackUrl: '/' });
  };

  const roleLabel = role === 'VENDOR' ? 'Ground Owner' : 'Player';
  const busy = loading || success;
  const strength = passwordStrength(password);
  const strengthLevel = STRENGTH_LEVELS[strength];

  const describedBy = (field, hintId) => {
    const ids = [];
    if (hintId) ids.push(hintId);
    if (showError(field)) ids.push(`reg-${field}-error`);
    return ids.length ? ids.join(' ') : undefined;
  };

  return (
    <div className={styles.page}>
      {/* ── Form panel ── */}
      <section className={styles.formPanel}>
        <div className={styles.formInner}>
          <header className={styles.formHeader}>
            <span className={styles.formEyebrow}>Create your account</span>
            <h1 className={styles.formTitle}>Join Sportferry</h1>
            <p className={styles.formSubtitle}>
              Pick how you want to use Sportferry — you can switch later.
            </p>
          </header>

            {/* Account type */}
            <fieldset className={styles.roleFieldset} disabled={busy}>
              <legend className={styles.roleLegend}>I&apos;m joining as</legend>
              <div className={styles.roleGrid}>
                {ROLES.map(({ value, label, desc, Icon, points }) => {
                  const active = role === value;
                  return (
                    <label
                      key={value}
                      className={`${styles.roleCard} ${active ? styles.roleCardActive : ''}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={value}
                        checked={active}
                        onChange={() => setRole(value)}
                        className={styles.roleInput}
                      />
                      <span className={styles.roleTop}>
                        <span className={styles.roleIcon}><Icon size={19} strokeWidth={2.2} /></span>
                        <span className={styles.roleCheck} aria-hidden="true">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      </span>
                      <span className={styles.roleName}>{label}</span>
                      <span className={styles.roleDesc}>{desc}</span>
                      <ul className={styles.roleList}>
                        {points.map((point) => <li key={point}>{point}</li>)}
                      </ul>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Google */}
            <button
              type="button"
              className={styles.googleBtn}
              onClick={handleGoogleSignUp}
              disabled={busy || googleLoading}
            >
              <GoogleIcon />
              {googleLoading ? 'Redirecting…' : `Continue as ${roleLabel} with Google`}
            </button>

            <div className={styles.divider}>or sign up with email</div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                  <label className={styles.label} htmlFor="reg-name">Full name</label>
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => markTouched('name')}
                    placeholder="e.g. Arjun Mehta"
                    className={`${styles.input} ${showError('name') ? styles.inputError : ''}`}
                    aria-invalid={showError('name') ? 'true' : undefined}
                    aria-describedby={describedBy('name')}
                    required
                  />
                  {showError('name') && (
                    <p className={styles.fieldError} id="reg-name-error">
                      <AlertCircle size={13} aria-hidden="true" /> {errors.name}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="reg-email">Email</label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => markTouched('email')}
                    placeholder="you@example.com"
                    className={`${styles.input} ${showError('email') ? styles.inputError : ''}`}
                    aria-invalid={showError('email') ? 'true' : undefined}
                    aria-describedby={describedBy('email')}
                    required
                  />
                  {showError('email') && (
                    <p className={styles.fieldError} id="reg-email-error">
                      <AlertCircle size={13} aria-hidden="true" /> {errors.email}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="reg-password">Password</label>
                  <div className={styles.inputWrap}>
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => markTouched('password')}
                      placeholder={`At least ${PASSWORD_MIN} characters`}
                      className={`${styles.input} ${styles.inputWithAction} ${showError('password') ? styles.inputError : ''}`}
                      aria-invalid={showError('password') ? 'true' : undefined}
                      aria-describedby={describedBy('password', password ? 'reg-password-strength' : undefined)}
                      required
                      minLength={PASSWORD_MIN}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {password && (
                    <div className={styles.strength} id="reg-password-strength">
                      <div className={styles.strengthTrack} aria-hidden="true">
                        {[1, 2, 3, 4].map((step) => (
                          <span
                            key={step}
                            className={`${styles.strengthBar} ${step <= strength ? strengthLevel.className : ''}`}
                          />
                        ))}
                      </div>
                      <div className={styles.strengthRow}>
                        <span>Password strength</span>
                        <span className={styles.strengthLabel} aria-live="polite">{strengthLevel.label}</span>
                      </div>
                    </div>
                  )}

                  {showError('password') && (
                    <p className={styles.fieldError} id="reg-password-error">
                      <AlertCircle size={13} aria-hidden="true" /> {errors.password}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="reg-confirm-password">Confirm password</label>
                  <div className={styles.inputWrap}>
                    <input
                      id="reg-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => markTouched('confirmPassword')}
                      placeholder="Re-enter your password"
                      className={`${styles.input} ${styles.inputWithAction} ${showError('confirmPassword') ? styles.inputError : ''}`}
                      aria-invalid={showError('confirmPassword') ? 'true' : undefined}
                      aria-describedby={describedBy('confirmPassword')}
                      required
                      minLength={PASSWORD_MIN}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showConfirmPassword}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {showError('confirmPassword') && (
                    <p className={styles.fieldError} id="reg-confirmPassword-error">
                      <AlertCircle size={13} aria-hidden="true" /> {errors.confirmPassword}
                    </p>
                  )}
                </div>
              {error && (
                <div className={styles.alert} role="alert">
                  <AlertCircle size={16} className={styles.alertIcon} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className={styles.successAlert} role="status">
                  <Check size={16} aria-hidden="true" />
                  Account created — taking you in…
                </div>
              )}

              <button type="submit" className={styles.submit} disabled={busy}>
                {loading || success
                  ? <><Loader2 size={17} className={styles.spinner} aria-hidden="true" /> Creating account…</>
                  : `Create ${roleLabel} Account`}
              </button>

              <p className={styles.terms}>
                By creating an account you agree to our{' '}
                <Link href="/terms-of-service" className={styles.termsLink}>Terms of Service</Link>{' '}
                and{' '}
                <Link href="/privacy-policy" className={styles.termsLink}>Privacy Policy</Link>.
              </p>
            </form>

            <div className={styles.signin}>
              Already have an account?{' '}
              <Link href="/login" className={styles.signinLink}>Sign in</Link>
            </div>

            <div className={styles.trustNote}>
              <ShieldCheck size={13} aria-hidden="true" /> Secure sign-up · No spam, ever
            </div>
          </div>
        </section>
    </div>
  );
}
