/**
 * Minimal email sender. Uses Resend when RESEND_API_KEY is configured.
 * Returns true if an email was sent, false if no provider is set up.
 */

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const from = process.env.EMAIL_FROM || 'Sportferry <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: 'Reset your Sportferry password',
      html: `
        <div style="font-family:sans-serif;line-height:1.6">
          <h2>Reset your password</h2>
          <p>Click the button below to choose a new password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Reset password</a></p>
          <p style="color:#64748b;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}`);
  }
  return true;
}
