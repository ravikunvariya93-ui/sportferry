import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Sportferry',
  description: 'How Sportferry collects, uses and shares information when you book a sports venue.',
};

const sectionStyle = { padding: '24px', borderRadius: '18px' };
const headingStyle = { fontSize: '20px', fontWeight: 700, marginBottom: '10px' };
const bodyStyle = { color: 'var(--muted)', fontSize: '14px', lineHeight: '1.8' };

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.5px' }}>Privacy Policy</h1>
      <p style={bodyStyle}>
        This policy explains what Sportferry does with your information when you discover venues,
        book a slot or list a ground.
      </p>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Information we collect</h2>
        <ul style={{ ...bodyStyle, paddingLeft: '20px' }}>
          <li>Account details: name, username, email, phone and city.</li>
          <li>Booking details: venue, date, slot, game type, players and payment status.</li>
          <li>Location you choose or detect to show nearby venues.</li>
        </ul>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>How we use it</h2>
        <p style={bodyStyle}>
          We use this information to create and manage bookings, show real-time availability, process
          payments and answer support requests. If you sign in with Google, we use your verified email
          to create your account or link it to an existing one.
        </p>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Who we share it with</h2>
        <p style={bodyStyle}>
          Payments are handled by Razorpay; card details are collected by the payment provider and are
          not stored by Sportferry. The venue owner sees the booking details needed to host your game,
          including the player name and contact details. We do not sell your personal information.
        </p>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Your choices</h2>
        <p style={bodyStyle}>
          You can update your name, phone and city, change your password, or delete your account from
          your <Link href="/profile" style={{ color: 'var(--primary)' }}>profile</Link>. Refunds and
          cancellation rules are described in the{' '}
          <Link href="/cancellation-policy" style={{ color: 'var(--primary)' }}>Cancellation &amp; Refund Policy</Link>.
        </p>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Contact</h2>
        <p style={bodyStyle}>Questions about your data? Email support@sportferry.com.</p>
      </section>
    </div>
  );
}
